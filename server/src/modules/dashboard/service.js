const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { getJobCosting } = require("../finance/service");
const { getExpiringWarranties } = require("../warranty/service");

function getTimeframeFilter(timeframe) {
  const now = new Date();
  if (timeframe === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { gte: start };
  }
  if (timeframe === "week") {
    const start = new Date(now.getTime() - 7 * 86400000);
    return { gte: start };
  }
  if (timeframe === "month") {
    const start = new Date(now.getTime() - 30 * 86400000);
    return { gte: start };
  }
  return undefined;
}

async function getDashboardStats(companyId, timeframe = "month") {
  const dateFilter = getTimeframeFilter(timeframe);
  const whereCreated = dateFilter ? { companyId, createdAt: dateFilter } : { companyId };

  // 1. Leads & Conversion Rate
  const allLeads = await prisma.lead.findMany({
    where: { companyId, archivedAt: null },
    select: { id: true, stage: true, createdAt: true },
  });

  const newLeadsCount = dateFilter
    ? allLeads.filter((l) => new Date(l.createdAt) >= dateFilter.gte).length
    : allLeads.length;

  const wonLeadsCount = allLeads.filter((l) => l.stage === "WON").length;
  const conversionRate = allLeads.length > 0 ? ((wonLeadsCount / allLeads.length) * 100).toFixed(1) : 0;

  // Leads distribution by stage for Recharts (Dynamic from DB)
  const leadStageDefs = [
    { id: "NEW", label: "New Leads" },
    { id: "CONTACTED", label: "Contacted" },
    { id: "QUALIFIED", label: "Qualified" },
    { id: "SURVEY_SCHEDULED", label: "Survey Booked" },
    { id: "SURVEY_DONE", label: "Survey Done" },
    { id: "SURVEY_APPROVED", label: "Survey Approved" },
    { id: "QUOTED", label: "Quoted" },
    { id: "WON", label: "Won" },
    { id: "LOST", label: "Lost" },
  ];

  const leadsByStage = leadStageDefs.map((def) => ({
    stage: def.label,
    stageKey: def.id,
    count: allLeads.filter((l) => l.stage === def.id).length,
  }));

  // 2. Quotes & Orders
  const quotesPendingCount = await prisma.quote.count({
    where: { companyId, status: { in: ["DRAFT", "SENT"] } },
  });

  const ordersCount = await prisma.salesOrder.count({ where: whereCreated });

  // 3. Jobs Status Breakdown & Stuck Steps
  const allJobs = await prisma.installationJob.findMany({
    where: { companyId },
    include: {
      order: { select: { orderNumber: true, status: true } },
      customer: { select: { name: true } },
    },
  });

  const jobsCompletedCount = allJobs.filter((j) => j.status === "COMPLETED").length;
  const jobsInProgressCount = allJobs.filter((j) => j.status === "IN_PROGRESS").length;

  const unfinishedJobs = allJobs
    .filter((j) => j.status !== "COMPLETED")
    .map((j) => {
      let stuckStep = "Awaiting Installation Schedule";
      if (j.order?.status === "PICKING" || j.order?.status === "CONFIRMED") {
        stuckStep = "Awaiting Serial Scanning / Warehouse Dispatch";
      } else if (j.status === "SCHEDULED") {
        stuckStep = "Awaiting Technician Site Arrival";
      } else if (j.status === "IN_PROGRESS") {
        if (!j.powerTestPassed) stuckStep = "Electrical & Power Test Pending";
        else stuckStep = "Customer Acceptance Signature Pending";
      } else if (j.status === "BLOCKED") {
        stuckStep = `Blocked: ${j.blockedReason || "Site obstacle"}`;
      }

      return {
        id: j.id,
        jobNumber: j.jobNumber,
        customerName: j.customer?.name,
        orderNumber: j.order?.orderNumber,
        status: j.status,
        stuckStep,
      };
    });

  // 4. Revenue, Collections & Outstanding (Direct from DB)
  const allOrders = await prisma.salesOrder.findMany({
    where: { companyId },
    select: { totalAmount: true, confirmedAt: true, createdAt: true },
  });
  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const allPayments = await prisma.payment.findMany({
    where: { companyId, status: "COMPLETED" },
    select: { amount: true, receivedAt: true, createdAt: true },
  });
  const totalCollections = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalOutstanding = Math.max(0, totalRevenue - totalCollections);

  // Timeframe-filtered orders & payments
  const filteredOrders = dateFilter
    ? allOrders.filter((o) => new Date(o.confirmedAt || o.createdAt) >= dateFilter.gte)
    : allOrders;
  const filteredRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const filteredPayments = dateFilter
    ? allPayments.filter((p) => new Date(p.receivedAt || p.createdAt) >= dateFilter.gte)
    : allPayments;
  const filteredCollections = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const filteredOutstanding = Math.max(0, filteredRevenue - filteredCollections);

  // 5. Job Costing & Comprehensive Profit & Loss
  const jobCostings = await getJobCosting(companyId);
  const lossMakingJobsCount = jobCostings.filter((j) => j.isLossMaking).length;
  const profitableJobsCount = jobCostings.length - lossMakingJobsCount;
  const totalBOMCost = jobCostings.reduce((sum, j) => sum + Number(j.bomCost || 0), 0);
  const totalLaborCost = jobCostings.reduce((sum, j) => sum + Number(j.technicianCost || 0), 0);
  const totalOtherCosts = jobCostings.reduce((sum, j) => sum + Number(j.otherCosts || 0), 0);
  const totalJobCosts = totalBOMCost + totalLaborCost + totalOtherCosts;
  const totalCostingRevenue = jobCostings.reduce((sum, j) => sum + Number(j.revenue || 0), 0);
  const totalNetProfit = totalCostingRevenue - totalJobCosts;
  const overallGrossMargin = totalCostingRevenue > 0 ? Number(((totalNetProfit / totalCostingRevenue) * 100).toFixed(1)) : 0;

  // 6. Open Tickets with Age
  const openTickets = await prisma.ticket.findMany({
    where: {
      companyId,
      status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS"] },
    },
    include: { customer: { select: { name: true } } },
    orderBy: { reportedAt: "asc" },
  });

  const openTicketsWithAge = openTickets.map((t) => {
    const ageDays = Math.floor((Date.now() - new Date(t.reportedAt).getTime()) / 86400000);
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      customerName: t.customer?.name,
      status: t.status,
      priority: t.priority,
      ageDays,
    };
  });

  // 7. Low Stock Products
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true, sku: true, stockQty: true, reorderLevel: true, category: true },
  });
  const lowStockProducts = products.filter((p) => Number(p.stockQty) <= Number(p.reorderLevel));

  // 8. Warranties Expiring in 60 Days
  const expiringWarranties = await getExpiringWarranties(companyId, 60);

  // 9. Dynamic Monthly Revenue & Collections Trend (Calculated from Real DB Records)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthlyTrends = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthLabel = monthNames[month];

    const monthRevenue = allOrders
      .filter((o) => {
        const orderDate = new Date(o.confirmedAt || o.createdAt);
        return orderDate.getFullYear() === year && orderDate.getMonth() === month;
      })
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const monthCollections = allPayments
      .filter((p) => {
        const payDate = new Date(p.receivedAt || p.createdAt);
        return payDate.getFullYear() === year && payDate.getMonth() === month;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    monthlyTrends.push({
      month: monthLabel,
      year,
      revenue: Math.round(monthRevenue),
      collections: Math.round(monthCollections),
    });
  }

  return {
    timeframe,
    kpis: {
      newLeads: newLeadsCount,
      totalLeads: allLeads.length,
      conversionRate: Number(conversionRate),
      quotesPending: quotesPendingCount,
      ordersCount: filteredOrders.length,
      totalOrdersCount: allOrders.length,
      jobsCompleted: jobsCompletedCount,
      jobsInProgress: jobsInProgressCount,
      jobsUnfinished: unfinishedJobs.length,
      totalRevenue: Math.round(filteredRevenue),
      totalCollections: Math.round(filteredCollections),
      totalOutstanding: Math.round(filteredOutstanding),
      allTimeRevenue: Math.round(totalRevenue),
      allTimeCollections: Math.round(totalCollections),
      allTimeOutstanding: Math.round(totalOutstanding),
      totalNetProfit: Math.round(totalNetProfit),
      overallGrossMargin,
      totalBOMCost: Math.round(totalBOMCost),
      totalLaborCost: Math.round(totalLaborCost),
      totalJobCosts: Math.round(totalJobCosts),
      lossMakingJobsCount,
      profitableJobsCount,
      openTicketsCount: openTicketsWithAge.length,
      lowStockCount: lowStockProducts.length,
      expiringWarrantiesCount: expiringWarranties.length,
    },
    unfinishedJobs,
    jobCostings,
    openTicketsWithAge,
    lowStockProducts,
    expiringWarranties,
    charts: {
      leadsByStage,
      monthlyTrends,
    },
  };
}

async function exportDashboardCsv(companyId) {
  const costing = await getJobCosting(companyId);

  const header = "Order Number,Customer Name,Capacity (kW),Revenue (INR),BOM Cost,Technician Cost,Other Costs,Total Cost,Profit (INR),Margin (%),Status,Is Loss\n";
  const rows = costing.map((c) =>
    `"${c.orderNumber}","${c.customerName}",${c.capacityKw},${c.revenue},${c.bomCost},${c.technicianCost},${c.otherCosts},${c.totalCost},${c.profit},${c.profitMargin}%,"${c.status}","${c.isLossMaking ? "LOSS" : "PROFIT"}"`
  );

  return header + rows.join("\n");
}

async function createShareableLink(companyId, expiresInDays = 7, userId = null) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000);

  await prisma.dashboardShareLink.create({
    data: {
      companyId,
      tokenHash,
      createdById: userId,
      expiresAt,
    },
  });

  return {
    token: rawToken,
    expiresAt,
    shareUrl: `/shared-dashboard?token=${rawToken}`,
  };
}

async function getSharedDashboard(rawToken) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const link = await prisma.dashboardShareLink.findUnique({
    where: { tokenHash },
    include: { company: true },
  });

  if (!link || link.revokedAt || new Date() > link.expiresAt) {
    const error = new Error("This shared dashboard link is invalid or has expired.");
    error.statusCode = 403;
    throw error;
  }

  // Update lastAccessAt
  await prisma.dashboardShareLink.update({
    where: { id: link.id },
    data: { lastAccessAt: new Date() },
  });

  const stats = await getDashboardStats(link.companyId, "all");
  return {
    companyName: link.company.name,
    expiresAt: link.expiresAt,
    stats,
  };
}

module.exports = {
  getDashboardStats,
  exportDashboardCsv,
  createShareableLink,
  getSharedDashboard,
};

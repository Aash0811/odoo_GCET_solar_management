const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { generateInvoicePdf } = require("../../utils/pdf");

// Business Rule 9:
// Job costing per order: profit = revenue - BOM cost - technician cost (hours x rate) - other costs.
// Flag loss-making jobs.
async function getJobCosting(companyId, filters = {}) {
  const { orderId, isLossOnly } = filters;
  const where = { companyId };
  if (orderId) where.id = orderId;

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      quote: {
        include: {
          lines: { select: { quantity: true, unitCost: true, unitPrice: true, lineTotal: true } },
        },
      },
      timeEntries: {
        include: { user: { select: { id: true, name: true } } },
      },
      costEntries: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const costing = orders.map((order) => {
    const revenue = Number(order.revenue || order.totalAmount || 0);

    // 1. Calculate BOM Cost (from quote lines unitCost * quantity)
    const bomCost = (order.quote?.lines || []).reduce(
      (sum, l) => sum + Number(l.quantity) * Number(l.unitCost || 0),
      0
    );

    // 2. Calculate Technician Cost (from timeEntries labourCost)
    const technicianCost = (order.timeEntries || []).reduce(
      (sum, t) => sum + Number(t.labourCost || 0),
      0
    );

    // 3. Other additional job costs
    const otherCosts = (order.costEntries || []).reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );

    const totalCost = bomCost + technicianCost + otherCosts;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const isLossMaking = profit < 0;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      capacityKw: order.capacityKw,
      status: order.status,
      revenue,
      bomCost,
      technicianCost,
      otherCosts,
      totalCost,
      profit,
      profitMargin: Number(profitMargin.toFixed(2)),
      isLossMaking, // FLAGGED
    };
  });

  if (isLossOnly === "true") {
    return costing.filter((c) => c.isLossMaking);
  }

  return costing;
}

// Business Rule 10:
// Subsidy tracker per customer (docs submitted, status, expected/received amount).
async function getSubsidyTracker(companyId) {
  return await prisma.subsidyApplication.findMany({
    where: { companyId },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function updateSubsidy(companyId, id, data, actorId, req = null) {
  const application = await prisma.subsidyApplication.findFirst({
    where: { id, companyId },
  });

  if (!application) {
    const error = new Error("Subsidy application not found.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.subsidyApplication.update({
      where: { id },
      data: {
        status: data.status,
        applicationNumber: data.applicationNumber || application.applicationNumber,
        expectedAmount: data.expectedAmount !== undefined ? data.expectedAmount : application.expectedAmount,
        receivedAmount: data.receivedAmount !== undefined ? data.receivedAmount : application.receivedAmount,
        documentsSubmitted: data.documentsSubmitted !== undefined ? data.documentsSubmitted : application.documentsSubmitted,
        authority: data.authority || application.authority,
        referenceNumber: data.referenceNumber || application.referenceNumber,
        notes: data.notes || application.notes,
        submittedAt: data.status === "SUBMITTED" && !application.submittedAt ? new Date() : application.submittedAt,
        approvedAt: data.status === "APPROVED" && !application.approvedAt ? new Date() : application.approvedAt,
        receivedAt: data.status === "RECEIVED" && !application.receivedAt ? new Date() : application.receivedAt,
      },
      include: { customer: true },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "SubsidyApplication",
        entityId: id,
        oldValue: { status: application.status, receivedAmount: application.receivedAmount },
        newValue: { status: updated.status, receivedAmount: updated.receivedAmount },
        req,
      },
      tx
    );

    return updated;
  });
}

// Business Rule 10:
// Technician payout summary from TimeEntry.
async function getTechnicianPayoutSummary(companyId) {
  const timeEntries = await prisma.timeEntry.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, name: true, role: true, phone: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const summaryByTech = {};

  timeEntries.forEach((entry) => {
    const techId = entry.userId;
    if (!summaryByTech[techId]) {
      summaryByTech[techId] = {
        technicianId: techId,
        name: entry.user.name,
        phone: entry.user.phone,
        totalHours: 0,
        totalPayout: 0,
        entriesCount: 0,
        approvedEntriesCount: 0,
      };
    }

    summaryByTech[techId].totalHours += Number(entry.hours || 0);
    summaryByTech[techId].totalPayout += Number(entry.labourCost || 0);
    summaryByTech[techId].entriesCount += 1;
    if (entry.approved) {
      summaryByTech[techId].approvedEntriesCount += 1;
    }
  });

  return Object.values(summaryByTech);
}

async function getInvoices(companyId, filters = {}) {
  const { status, customerId } = filters;
  const where = { companyId };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  return await prisma.invoice.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      ticket: { select: { id: true, ticketNumber: true, title: true } },
      order: { select: { id: true, orderNumber: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getInvoicePdfBuffer(companyId, id) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { customer: true, lines: true },
  });

  if (!invoice) {
    const error = new Error("Invoice not found.");
    error.statusCode = 404;
    throw error;
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  return await generateInvoicePdf(invoice, company);
}

async function addCostEntry(companyId, data, actorId, req = null) {
  return await prisma.$transaction(async (tx) => {
    const cost = await tx.costEntry.create({
      data: {
        companyId,
        orderId: data.orderId,
        category: data.category,
        description: data.description,
        amount: data.amount,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "CostEntry",
        entityId: cost.id,
        newValue: { amount: cost.amount, category: cost.category },
        req,
      },
      tx
    );

    return cost;
  });
}

module.exports = {
  getJobCosting,
  getSubsidyTracker,
  updateSubsidy,
  getTechnicianPayoutSummary,
  getInvoices,
  getInvoicePdfBuffer,
  addCostEntry,
};

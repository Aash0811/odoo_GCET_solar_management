const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { generateInvoicePdf } = require("../../utils/pdf");

// Business Rule 9:
// Job costing per order: profit = revenue - BOM cost - technician cost (hours x rate) - other costs.
// Flag loss-making jobs.
async function getJobCosting(companyId, filters = {}) {
  const { orderId, isLossOnly, dateFilter } = filters;
  const where = { companyId };
  if (orderId) where.id = orderId;
  if (dateFilter) {
    where.OR = [
      { confirmedAt: dateFilter },
      { createdAt: dateFilter },
    ];
  }

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
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
    };
  });

  if (isLossOnly === "true") {
    return costing.filter((c) => c.isLossMaking);
  }

  return costing;
}

// Business Rule 10:
// Subsidy tracker per customer (docs submitted, status, expected/received amount).
async function getSubsidyTracker(companyId, user = null) {
  const customerScope = user?.role === "CUSTOMER"
    ? {
        customer: user.email || user.phone
          ? {
              OR: [
                ...(user.email ? [{ email: user.email }] : []),
                ...(user.phone ? [{ phone: user.phone }] : []),
              ],
            }
          : { id: "__no_customer_access__" },
      }
    : {};

  return await prisma.subsidyApplication.findMany({
    where: { companyId, ...customerScope },
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

function customerInvoiceScope(user) {
  if (!user || user.role !== "CUSTOMER") return {};
  const identity = [];
  if (user.email) identity.push({ email: user.email });
  if (user.phone) identity.push({ phone: user.phone });
  return {
    customer: identity.length ? { OR: identity } : { id: "__no_customer_access__" },
  };
}

async function getInvoices(companyId, filters = {}, user = null) {
  const { status, customerId } = filters;
  const where = { companyId, ...customerInvoiceScope(user) };
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

async function getInvoicePdfBuffer(companyId, id, user = null) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, ...customerInvoiceScope(user) },
    include: {
      customer: true,
      lines: {
        include: { product: true },
      },
      order: {
        include: {
          customer: true,
          serialNumbers: {
            include: { product: true, warranties: true },
          },
          quote: {
            include: {
              lines: { include: { product: true } },
            },
          },
        },
      },
      ticket: {
        include: {
          customer: true,
          lines: {
            include: { product: true, serialNumber: { include: { warranties: true } } },
          },
        },
      },
    },
  });

  if (!invoice) {
    const error = new Error("Invoice not found.");
    error.statusCode = 404;
    throw error;
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  return await generateInvoicePdf(invoice, company);
}

async function recordInvoicePayment(companyId, id, data, user, req = null) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, ...customerInvoiceScope(user) },
  });

  if (!invoice) {
    const error = new Error("Invoice not found.");
    error.statusCode = 404;
    throw error;
  }

  const amount = Number(data.amount);
  const outstanding = Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid));
  if (amount > outstanding) {
    const error = new Error(`Payment exceeds the outstanding invoice balance of INR ${outstanding.toLocaleString("en-IN")}.`);
    error.statusCode = 400;
    throw error;
  }

  const amountPaid = Number(invoice.amountPaid) + amount;
  const status = amountPaid >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({
      where: { id },
      data: {
        amountPaid,
        amountDue: Math.max(0, Number(invoice.totalAmount) - amountPaid),
        status,
        paidAt: status === "PAID" ? new Date() : null,
        notes: `${invoice.notes || ""}\nPayment ${data.method}${data.reference ? ` (${data.reference})` : ""}: INR ${amount.toFixed(2)}`.trim(),
      },
      include: { customer: true, lines: true },
    });

    await recordAuditLog({
      companyId,
      actorId: user?.id,
      action: "PAYMENT_RECORDED",
      entityType: "Invoice",
      entityId: id,
      newValue: { amount, status, method: data.method, reference: data.reference || null },
      req,
    }, tx);

    return result;
  });

  return updated;
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
  recordInvoicePayment,
  addCostEntry,
};

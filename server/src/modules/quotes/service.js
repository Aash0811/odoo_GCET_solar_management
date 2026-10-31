const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { generateQuotePdf } = require("../../utils/pdf");

async function getQuotes(companyId, filters = {}) {
  const { status, leadId, customerId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (leadId) where.leadId = leadId;
  if (customerId) where.customerId = customerId;

  return await prisma.quote.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      packageTemplate: { select: { id: true, name: true, type: true } },
      lead: { select: { id: true, title: true, stage: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getQuoteById(companyId, id) {
  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      lead: true,
      packageTemplate: true,
      createdBy: { select: { id: true, name: true, email: true } },
      lines: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
      orders: {
        select: { id: true, orderNumber: true, status: true },
      },
    },
  });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  return quote;
}

async function createQuote(companyId, data, actorId, req = null) {
  // Business Rule 2: A Quote CANNOT be created unless the lead's Survey status is APPROVED.
  const lead = await prisma.lead.findFirst({
    where: { id: data.leadId, companyId },
    include: {
      surveys: {
        where: { status: "APPROVED" },
      },
      customer: true,
    },
  });

  if (!lead) {
    const error = new Error("Lead not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!lead.surveys || lead.surveys.length === 0) {
    const error = new Error("A Quote cannot be created unless the lead's Survey status is APPROVED.");
    error.statusCode = 400;
    throw error;
  }

  // Get customer id (or create customer from lead)
  let customerId = lead.customerId;
  if (!customerId) {
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: lead.contactName,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
      },
    });
    customerId = customer.id;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerId: customer.id },
    });
  }

  // Fetch package template with BOM
  const template = await prisma.packageTemplate.findFirst({
    where: { id: data.packageTemplateId, companyId },
    include: {
      bomLines: {
        include: { product: true },
      },
    },
  });

  if (!template) {
    const error = new Error("Package template not found.");
    error.statusCode = 404;
    throw error;
  }

  const capacityKw = Number(data.capacityKw);

  // Business Rule 3: Quote is generated from PackageTemplate which auto-expands into BOM lines scaled by kW. Lines are editable before sending.
  let linesToCreate = [];

  if (data.customLines && data.customLines.length > 0) {
    linesToCreate = data.customLines.map((l, index) => {
      const qty = Number(l.quantity);
      const price = Number(l.unitPrice);
      const cost = Number(l.unitCost || 0);
      return {
        productId: l.productId || null,
        description: l.description,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        gstRate: Number(l.gstRate || data.gstRate || 18),
        lineTotal: qty * price,
        sortOrder: index,
      };
    });
  } else {
    linesToCreate = template.bomLines.map((bom, index) => {
      const qty = Math.max(1, Math.ceil(Number(bom.quantityPerKw) * capacityKw + Number(bom.fixedQuantity)));
      const price = Number(bom.product.salePrice);
      const cost = Number(bom.product.costPrice);
      return {
        productId: bom.productId,
        description: `${bom.product.name} (${bom.product.sku})`,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        gstRate: Number(bom.product.gstRate || 18),
        lineTotal: qty * price,
        sortOrder: index,
      };
    });
  }

  const subtotal = linesToCreate.reduce((sum, line) => sum + line.lineTotal, 0);
  const discountAmount = Number(data.discountAmount || 0);
  const gstRate = Number(data.gstRate || 18);
  const gstAmount = ((subtotal - discountAmount) * gstRate) / 100;
  const totalAmount = subtotal - discountAmount + gstAmount;

  // Auto-generate quote number
  const count = await prisma.quote.count({ where: { companyId } });
  const quoteNumber = `Q-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const creatorId =
    actorId ||
    lead.assignedToId ||
    (await prisma.user.findFirst({ where: { companyId } }))?.id;

  return await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        companyId,
        customerId,
        leadId: lead.id,
        packageTemplateId: template.id,
        createdById: creatorId,
        quoteNumber,
        capacityKw,
        subtotal,
        discountAmount,
        gstRate,
        gstAmount,
        totalAmount,
        subsidyNote:
          data.subsidyNote ||
          "Eligible for Central PM Surya Ghar subsidy (up to ₹78,000 for 3kW+) subject to Discom net meter commissioning.",
        terms: data.terms || "10% Advance, 80% on Dispatch, 10% post commissioning.",
        notes: data.notes || null,
        status: "DRAFT",
        lines: {
          create: linesToCreate,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    // Update lead stage to QUOTED
    await tx.lead.update({
      where: { id: lead.id },
      data: { stage: "QUOTED" },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Quote",
        entityId: quote.id,
        newValue: { quoteNumber, totalAmount, capacityKw },
        req,
      },
      tx
    );

    return quote;
  });
}

async function updateQuoteStatus(companyId, id, newStatus, actorId, req = null) {
  const quote = await getQuoteById(companyId, id);

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id },
      data: {
        status: newStatus,
        sentAt: newStatus === "SENT" ? new Date() : quote.sentAt,
        acceptedAt: newStatus === "ACCEPTED" ? new Date() : quote.acceptedAt,
        rejectedAt: newStatus === "REJECTED" ? new Date() : quote.rejectedAt,
      },
    });

    // If accepted, lead stage is marked WON
    if (newStatus === "ACCEPTED") {
      await tx.lead.update({
        where: { id: quote.leadId },
        data: { stage: "WON" },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Quote",
        entityId: id,
        oldValue: { status: quote.status },
        newValue: { status: newStatus },
        req,
      },
      tx
    );

    return updated;
  });
}

async function getQuotePdfBuffer(companyId, id) {
  const quote = await getQuoteById(companyId, id);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  return await generateQuotePdf(quote, company);
}

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuoteStatus,
  getQuotePdfBuffer,
};

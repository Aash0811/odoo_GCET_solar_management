const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { generateQuotePdf } = require("../../utils/pdf");

const MAX_AUTO_DISCOUNT = 10000; // Discounts above ₹10,000 require manager approval

function calculateSubsidy(capacityKw) {
  const kw = Number(capacityKw) || 3;
  if (kw <= 1) return 30000;
  if (kw <= 2) return 60000;
  return 78000; // PM Surya Ghar Direct Benefit Transfer max ceiling is ₹78,000 for 3kW and above
}

function sanitizeQuote(quote, userRole = "ADMIN") {
  if (!quote) return quote;
  const isPrivileged = userRole === "ADMIN" || userRole === "DIRECTOR" || userRole === "MANAGER";

  // Calculate gross margin preview
  const lines = quote.lines || [];
  const totalCost = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitCost || 0), 0);
  const subtotal = Number(quote.subtotal || 0);
  const marginAmount = subtotal - totalCost;
  const marginPercentage = subtotal > 0 ? Number(((marginAmount / subtotal) * 100).toFixed(1)) : 0;

  if (isPrivileged) {
    return {
      ...quote,
      totalCost,
      marginAmount,
      marginPercentage,
    };
  }

  // Hide internal margin and cost price from Sales, Crew, and Customer
  const sanitizedLines = lines.map((line) => {
    const { unitCost, ...rest } = line;
    return rest;
  });

  return {
    ...quote,
    lines: sanitizedLines,
  };
}

async function getQuotes(companyId, filters = {}, userRole = "ADMIN") {
  const { status, leadId, customerId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (leadId) where.leadId = leadId;
  if (customerId) where.customerId = customerId;

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      packageTemplate: { select: { id: true, name: true, type: true } },
      lead: { select: { id: true, title: true, stage: true } },
      createdBy: { select: { id: true, name: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return quotes.map((q) => sanitizeQuote(q, userRole));
}

async function getQuoteById(companyId, id, userRole = "ADMIN") {
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

  return sanitizeQuote(quote, userRole);
}

async function getQuoteByShareToken(shareToken) {
  const quote = await prisma.quote.findUnique({
    where: { shareToken },
    include: {
      customer: true,
      lead: true,
      packageTemplate: true,
      lines: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
      company: {
        select: { id: true, name: true, phone: true, email: true, address: true, gstNumber: true },
      },
    },
  });

  if (!quote) {
    const error = new Error("Quotation link not found or expired.");
    error.statusCode = 404;
    throw error;
  }

  return sanitizeQuote(quote, "CUSTOMER");
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

  const subsidyAmount = data.subsidyAmount !== undefined ? Number(data.subsidyAmount) : calculateSubsidy(capacityKw);
  const netPayable = Math.max(0, totalAmount - subsidyAmount);

  // Validity Date & Share Token
  const validDays = Number(data.validDays || 30);
  const validUntil = new Date(Date.now() + validDays * 86400000);
  const shareToken = crypto.randomBytes(16).toString("hex");

  // Discount Approval Limit Enforcement
  const discountApprovalRequired = discountAmount > MAX_AUTO_DISCOUNT;
  const discountApproved = !discountApprovalRequired;
  const initialStatus = discountApprovalRequired ? "PENDING_APPROVAL" : "DRAFT";

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
        subsidyAmount,
        netPayable,
        validUntil,
        shareToken,
        version: 1,
        discountApprovalRequired,
        discountApproved,
        subsidyNote:
          data.subsidyNote ||
          `Eligible for Central PM Surya Ghar subsidy (₹${subsidyAmount.toLocaleString("en-IN")}) subject to Discom net meter commissioning.`,
        terms: data.terms || "10% Advance, 80% on Dispatch, 10% post commissioning.",
        notes: data.notes || null,
        status: initialStatus,
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
        actorId: creatorId,
        action: "CREATE",
        entityType: "Quote",
        entityId: quote.id,
        newValue: { quoteNumber, totalAmount, capacityKw, version: 1, discountAmount, discountApprovalRequired },
        req,
      },
      tx
    );

    return sanitizeQuote(quote, "ADMIN");
  });
}

// ─────────────────────────────────────────────────────────────
// Editable Lines (Panel brand swap, extra cable length) with Versioning & Audit
// ─────────────────────────────────────────────────────────────
async function updateQuoteLines(companyId, id, data, actorId, req = null) {
  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { lines: true },
  });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  if (quote.status === "ACCEPTED" || quote.status === "CONVERTED") {
    const error = new Error("Accepted or converted quotes cannot be modified.");
    error.statusCode = 400;
    throw error;
  }

  const linesToCreate = (data.customLines || []).map((l, index) => {
    const qty = Number(l.quantity);
    const price = Number(l.unitPrice);
    const cost = Number(l.unitCost || 0);
    return {
      productId: l.productId || null,
      description: l.description,
      quantity: qty,
      unitPrice: price,
      unitCost: cost,
      gstRate: Number(l.gstRate || quote.gstRate || 18),
      lineTotal: qty * price,
      sortOrder: index,
    };
  });

  const subtotal = linesToCreate.reduce((sum, line) => sum + line.lineTotal, 0);
  const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Number(quote.discountAmount);
  const gstRate = Number(quote.gstRate || 18);
  const gstAmount = ((subtotal - discountAmount) * gstRate) / 100;
  const totalAmount = subtotal - discountAmount + gstAmount;

  const subsidyAmount = data.subsidyAmount !== undefined ? Number(data.subsidyAmount) : Number(quote.subsidyAmount);
  const netPayable = Math.max(0, totalAmount - subsidyAmount);

  // Evaluate discount limit
  const discountApprovalRequired = discountAmount > MAX_AUTO_DISCOUNT;
  const discountApproved = !discountApprovalRequired;
  const newStatus = discountApprovalRequired ? "PENDING_APPROVAL" : (quote.status === "PENDING_APPROVAL" ? "DRAFT" : quote.status);
  const newVersion = quote.version + 1;

  return await prisma.$transaction(async (tx) => {
    // Delete existing lines
    await tx.quoteLine.deleteMany({
      where: { quoteId: id },
    });

    // Update quote header with new totals and incremented version (v2, v3, etc.)
    const updated = await tx.quote.update({
      where: { id },
      data: {
        subtotal,
        discountAmount,
        gstAmount,
        totalAmount,
        subsidyAmount,
        netPayable,
        version: newVersion,
        discountApprovalRequired,
        discountApproved,
        status: newStatus,
        notes: data.notes !== undefined ? data.notes : quote.notes,
        lines: {
          create: linesToCreate,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "Quote",
        entityId: id,
        oldValue: { version: quote.version, totalAmount: quote.totalAmount, linesCount: quote.lines.length },
        newValue: { version: newVersion, totalAmount, linesCount: linesToCreate.length, discountAmount },
        metadata: { changeType: "UPDATE_LINES" },
        req,
      },
      tx
    );

    return sanitizeQuote(updated, "ADMIN");
  });
}

// ─────────────────────────────────────────────────────────────
// Discount Approval Workflow (Manager / Director only)
// ─────────────────────────────────────────────────────────────
async function reviewDiscount(companyId, id, { approved, notes }, actorId, req = null) {
  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
  });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  const newStatus = approved ? "DRAFT" : "REJECTED";

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id },
      data: {
        discountApproved: Boolean(approved),
        discountApprovalRequired: false,
        discountApprovedById: actorId,
        status: newStatus,
        notes: notes ? `${quote.notes ? quote.notes + "\n" : ""}[Manager Discount Note]: ${notes}` : quote.notes,
      },
      include: { lines: true, customer: true },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Quote",
        entityId: id,
        newValue: { approved, discountAmount: quote.discountAmount, status: newStatus },
        metadata: { changeType: "DISCOUNT_APPROVAL" },
        req,
      },
      tx
    );

    return sanitizeQuote(updated, "ADMIN");
  });
}

// ─────────────────────────────────────────────────────────────
// Customer Accept Online with Digital Acceptance Record
// ─────────────────────────────────────────────────────────────
async function acceptQuote(companyId, idOrToken, acceptanceData = {}, req = null) {
  const where = idOrToken.length === 32 ? { shareToken: idOrToken } : { id: idOrToken, companyId };
  const quote = await prisma.quote.findFirst({
    where,
    include: { lines: true },
  });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  // Gate: cannot accept if discount is pending manager approval
  if (quote.discountApprovalRequired && !quote.discountApproved) {
    const error = new Error("This quotation has a high discount pending manager approval before acceptance.");
    error.statusCode = 400;
    throw error;
  }

  const clientIp = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "127.0.0.1";
  const userAgent = req?.headers?.["user-agent"] || "Online Browser";

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptanceSignature: acceptanceData.signature || null,
        acceptanceNotes: acceptanceData.notes || null,
        acceptanceIp: String(clientIp),
        acceptanceUserAgent: String(userAgent),
      },
      include: { lines: true, customer: true },
    });

    if (quote.leadId) {
      await tx.lead.update({
        where: { id: quote.leadId },
        data: { stage: "WON" },
      });
    }

    await recordAuditLog(
      {
        companyId: quote.companyId,
        action: "SIGNATURE_CAPTURED",
        entityType: "Quote",
        entityId: quote.id,
        newValue: { status: "ACCEPTED", clientIp, acceptedAt: updated.acceptedAt },
        metadata: { changeType: "CUSTOMER_ACCEPTANCE" },
        req,
      },
      tx
    );

    return sanitizeQuote(updated, "CUSTOMER");
  });
}

// ─────────────────────────────────────────────────────────────
// Customer Reject Online
// ─────────────────────────────────────────────────────────────
async function rejectQuote(companyId, idOrToken, { reason }, req = null) {
  const where = idOrToken.length === 32 ? { shareToken: idOrToken } : { id: idOrToken, companyId };
  const quote = await prisma.quote.findFirst({ where });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        notes: reason ? `${quote.notes ? quote.notes + "\n" : ""}[Rejection Reason]: ${reason}` : quote.notes,
      },
      include: { lines: true, customer: true },
    });

    await recordAuditLog(
      {
        companyId: quote.companyId,
        action: "STATUS_CHANGE",
        entityType: "Quote",
        entityId: quote.id,
        newValue: { status: "REJECTED", reason },
        metadata: { changeType: "CUSTOMER_REJECTION" },
        req,
      },
      tx
    );

    return sanitizeQuote(updated, "CUSTOMER");
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

    if (newStatus === "ACCEPTED" && quote.leadId) {
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

    return sanitizeQuote(updated, "ADMIN");
  });
}

async function getQuotePdfBuffer(companyId, id) {
  const quote = await getQuoteById(companyId, id, "ADMIN");
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  return await generateQuotePdf(quote, company);
}

module.exports = {
  getQuotes,
  getQuoteById,
  getQuoteByShareToken,
  createQuote,
  updateQuoteLines,
  reviewDiscount,
  acceptQuote,
  rejectQuote,
  updateQuoteStatus,
  getQuotePdfBuffer,
  MAX_AUTO_DISCOUNT,
};

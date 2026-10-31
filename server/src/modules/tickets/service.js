const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { createNotification } = require("../../utils/notify");

async function getTickets(companyId, filters = {}) {
  const { status, priority, assignedToId, customerId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (customerId) where.customerId = customerId;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
      lines: {
        include: { product: true, serialNumber: true },
      },
      invoices: {
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
      },
    },
    orderBy: { reportedAt: "desc" },
  });

  const now = Date.now();
  return tickets.map((t) => {
    const ageDays = Math.floor((now - new Date(t.reportedAt).getTime()) / 86400000);
    return {
      ...t,
      ageDays,
    };
  });
}

async function getTicketById(companyId, id) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      order: {
        include: {
          serialNumbers: { include: { product: true, warranties: true } },
        },
      },
      assignedTo: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: { product: true, serialNumber: { include: { warranties: true } } },
      },
      invoices: {
        include: { lines: true },
      },
    },
  });

  if (!ticket) {
    const error = new Error("Ticket not found.");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
}

async function createTicket(companyId, data, actorId, req = null) {
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, companyId },
  });

  if (!customer) {
    const error = new Error("Customer not found.");
    error.statusCode = 404;
    throw error;
  }

  const count = await prisma.ticket.count({ where: { companyId } });
  const ticketNumber = `TCK-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        companyId,
        customerId: customer.id,
        orderId: data.orderId || null,
        createdById: actorId,
        assignedToId: data.assignedToId || null,
        ticketNumber,
        title: data.title,
        description: data.description || null,
        priority: data.priority || "MEDIUM",
        status: data.assignedToId ? "ASSIGNED" : "NEW",
        assignedAt: data.assignedToId ? new Date() : null,
      },
      include: { customer: true },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Ticket",
        entityId: ticket.id,
        newValue: { ticketNumber, status: ticket.status },
        req,
      },
      tx
    );

    if (data.assignedToId) {
      await createNotification(
        {
          companyId,
          userId: data.assignedToId,
          type: "TICKET_ASSIGNED",
          title: "Service Ticket Assigned",
          message: `Ticket ${ticketNumber}: '${ticket.title}' assigned to you.`,
          entityType: "Ticket",
          entityId: ticket.id,
        },
        tx
      );
    }

    return ticket;
  });
}

// Business Rule 8:
// If under warranty, parts and labour lines are priced 0;
// If expired, price normally.
async function addTicketLine(companyId, ticketId, lineData, actorId, req = null) {
  const ticket = await getTicketById(companyId, ticketId);

  let isWarrantyCovered = false;

  // Check warranty status if serial is provided
  if (lineData.serialNumberId) {
    const warranty = await prisma.warranty.findFirst({
      where: {
        serialNumberId: lineData.serialNumberId,
        companyId,
        status: "ACTIVE",
        endDate: { gte: new Date() },
      },
    });

    if (warranty) {
      isWarrantyCovered = true;
    }
  }

  const qty = Number(lineData.quantity || 1);
  const rawUnitPrice = Number(lineData.unitPrice || 0);
  const rawUnitCost = Number(lineData.unitCost || 0);

  // Business Rule 8: If under warranty, parts and labour lines are priced 0
  const unitPrice = isWarrantyCovered ? 0 : rawUnitPrice;
  const lineTotal = isWarrantyCovered ? 0 : qty * unitPrice;

  return await prisma.$transaction(async (tx) => {
    const line = await tx.ticketLine.create({
      data: {
        ticketId,
        productId: lineData.productId || null,
        serialNumberId: lineData.serialNumberId || null,
        type: lineData.type,
        description: lineData.description,
        quantity: qty,
        unitPrice,
        unitCost: rawUnitCost,
        lineTotal,
        isWarrantyCovered,
      },
      include: { product: true, serialNumber: true },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "TicketLine",
        entityId: line.id,
        newValue: { isWarrantyCovered, unitPrice, lineTotal },
        req,
      },
      tx
    );

    return line;
  });
}

// Business Rule 8:
// Ticket statuses: NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CUSTOMER_CONFIRMED → CLOSED.
// If expired parts/labour lines exist, auto-generate an Invoice.
// Replacing a unit swaps the serial and starts a new warranty.
async function resolveTicket(companyId, ticketId, data, actorId, req = null) {
  const ticket = await getTicketById(companyId, ticketId);

  return await prisma.$transaction(async (tx) => {
    // 1. Check for Unit Replacement (Serial Swap + New Warranty)
    let swappedNewSerial = null;
    if (data.replacedSerialId && data.newSerialString) {
      const oldSerial = await tx.serialNumber.findFirst({
        where: { id: data.replacedSerialId, companyId },
        include: { product: true },
      });

      if (oldSerial) {
        // Mark old serial as REPLACED
        await tx.serialNumber.update({
          where: { id: oldSerial.id },
          data: { status: "REPLACED" },
        });

        // Void or expire old warranty
        await tx.warranty.updateMany({
          where: { serialNumberId: oldSerial.id },
          data: { status: "VOID", voidedAt: new Date(), voidReason: "Unit replaced under service ticket" },
        });

        // Clear any prior replacement reference to preserve @unique constraint
        await tx.serialNumber.updateMany({
          where: { replacesSerialId: oldSerial.id },
          data: { replacesSerialId: null },
        });

        // Create new replacement serial
        swappedNewSerial = await tx.serialNumber.create({
          data: {
            companyId,
            productId: oldSerial.productId,
            orderId: oldSerial.orderId,
            customerId: ticket.customerId,
            serial: data.newSerialString.trim(),
            status: "INSTALLED",
            scannedAt: new Date(),
            deliveredAt: new Date(),
            installedAt: new Date(),
            replacesSerialId: oldSerial.id,
          },
        });

        // Start a brand new Warranty for the new unit
        const warrantyYears = oldSerial.product?.warrantyYears || 2;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + warrantyYears * 365 * 86400000);

        await tx.warranty.create({
          data: {
            companyId,
            customerId: ticket.customerId,
            serialNumberId: swappedNewSerial.id,
            status: "ACTIVE",
            startDate,
            endDate,
          },
        });
      }
    }

    // 2. Check for billable (out-of-warranty) lines to auto-generate Invoice
    const billableLines = ticket.lines.filter((l) => !l.isWarrantyCovered && Number(l.lineTotal) > 0);
    let invoice = null;

    if (billableLines.length > 0) {
      const subtotal = billableLines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
      const gstRate = 18;
      const gstAmount = (subtotal * gstRate) / 100;
      const totalAmount = subtotal + gstAmount;

      const invCount = await tx.invoice.count({ where: { companyId } });
      const invoiceNumber = `INV-SRV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, "0")}`;

      invoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: ticket.customerId,
          orderId: ticket.orderId || null,
          ticketId: ticket.id,
          createdById: actorId,
          invoiceNumber,
          status: "ISSUED",
          subtotal,
          gstAmount,
          totalAmount,
          amountDue: totalAmount,
          amountPaid: 0,
          issuedAt: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000), // Net 15 days
          notes: `Auto-generated service invoice for Ticket #${ticket.ticketNumber} (Out of warranty repairs).`,
          lines: {
            create: billableLines.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });
    }

    // 3. Mark ticket RESOLVED
    const resolvedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: data.resolutionNotes,
      },
      include: { lines: true, customer: true },
    });

    // 4. Record AuditLog
    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Ticket",
        entityId: ticketId,
        oldValue: { status: ticket.status },
        newValue: {
          status: "RESOLVED",
          invoiceNumber: invoice ? invoice.invoiceNumber : null,
          swappedSerial: swappedNewSerial ? swappedNewSerial.serial : null,
        },
        req,
      },
      tx
    );

    return {
      ticket: resolvedTicket,
      invoice,
      swappedNewSerial,
    };
  });
}

async function updateTicketStatus(companyId, ticketId, newStatus, actorId, req = null) {
  const ticket = await getTicketById(companyId, ticketId);

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        confirmedAt: newStatus === "CUSTOMER_CONFIRMED" ? new Date() : ticket.confirmedAt,
        closedAt: newStatus === "CLOSED" ? new Date() : ticket.closedAt,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Ticket",
        entityId: ticketId,
        oldValue: { status: ticket.status },
        newValue: { status: newStatus },
        req,
      },
      tx
    );

    return updated;
  });
}

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  addTicketLine,
  resolveTicket,
  updateTicketStatus,
};

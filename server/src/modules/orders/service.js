const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole, createNotification } = require("../../utils/notify");

async function getOrders(companyId, filters = {}) {
  const { status, customerId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  return await prisma.salesOrder.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      quote: { select: { id: true, quoteNumber: true, capacityKw: true } },
      payments: true,
      pickLists: { select: { id: true, pickNumber: true, status: true } },
      installationJobs: {
        select: {
          id: true,
          jobNumber: true,
          status: true,
          scheduledAt: true,
          technician: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getOrderById(companyId, id) {
  const order = await prisma.salesOrder.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      quote: {
        include: {
          lines: {
            include: { product: true },
          },
        },
      },
      payments: { orderBy: { receivedAt: "desc" } },
      pickLists: {
        include: {
          lines: { include: { product: true } },
        },
      },
      deliveries: {
        include: {
          order: true,
        },
      },
      serialNumbers: {
        include: { product: true, warranties: true },
      },
      installationJobs: {
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          photos: true,
          signature: true,
        },
      },
      timeEntries: true,
      costEntries: true,
    },
  });

  if (!order) {
    const error = new Error("Sales order not found.");
    error.statusCode = 404;
    throw error;
  }

  return order;
}

async function createOrderFromQuote(companyId, data, actorId, req = null) {
  const quote = await prisma.quote.findFirst({
    where: { id: data.quoteId, companyId },
    include: { lines: true, customer: true },
  });

  if (!quote) {
    const error = new Error("Quote not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check if order already exists for this quote
  const existingOrder = await prisma.salesOrder.findFirst({
    where: { quoteId: quote.id, companyId },
  });

  if (existingOrder) {
    return existingOrder;
  }

  const count = await prisma.salesOrder.count({ where: { companyId } });
  const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const creatorId =
    actorId ||
    quote.createdById ||
    (await prisma.user.findFirst({ where: { companyId } }))?.id;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        companyId,
        customerId: quote.customerId,
        quoteId: quote.id,
        createdById: creatorId,
        orderNumber,
        status: "PENDING_PAYMENT",
        capacityKw: quote.capacityKw,
        revenue: quote.totalAmount,
        subtotal: quote.subtotal,
        gstAmount: quote.gstAmount,
        totalAmount: quote.totalAmount,
        notes: data.notes || null,
      },
    });

    // Update quote status to CONVERTED/ACCEPTED
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // Update lead stage to WON if leadId exists
    if (quote.leadId) {
      await tx.lead.update({
        where: { id: quote.leadId },
        data: { stage: "WON" },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId: creatorId,
        action: "CREATE",
        entityType: "SalesOrder",
        entityId: order.id,
        newValue: { orderNumber, status: "PENDING_PAYMENT", totalAmount: order.totalAmount },
        req,
      },
      tx
    );

    return order;
  });
}

// Business Rule 4:
// Order is CONFIRMED only after an advance or full Payment is recorded.
// In ONE Prisma transaction, confirmation must automatically:
// - create a PickList (warehouse)
// - create an InstallationJob (scheduled on technician calendar)
// - create Notification records for both teams.
async function recordPaymentAndConfirm(companyId, orderId, paymentData, actorId, req = null) {
  const order = await getOrderById(companyId, orderId);

  const creatorId =
    actorId ||
    order.createdById ||
    (await prisma.user.findFirst({ where: { companyId } }))?.id;

  return await prisma.$transaction(async (tx) => {
    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        companyId,
        orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        transactionRef: paymentData.transactionRef || `TXN-${Date.now()}`,
        notes: paymentData.notes || null,
        status: "COMPLETED",
      },
    });

    // 2. If order is already CONFIRMED or later stage, just record payment
    if (order.status !== "PENDING_PAYMENT") {
      await recordAuditLog(
        {
          companyId,
          actorId: creatorId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          newValue: { amount: payment.amount, method: payment.method },
          req,
        },
        tx
      );

      return { order, payment };
    }

    // 3. Confirm Order
    const confirmedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    // 4. Automatically create PickList for warehouse
    const pickListCount = await tx.pickList.count({ where: { companyId } });
    const pickNumber = `PK-${new Date().getFullYear()}-${String(pickListCount + 1).padStart(4, "0")}`;

    // Extract and consolidate product lines from quote by productId to prevent duplicate key constraint
    const productLineMap = new Map();
    for (const line of (order.quote?.lines || [])) {
      if (!line.productId) continue;
      const existing = productLineMap.get(line.productId);
      if (existing) {
        existing.requiredQty = Number(existing.requiredQty) + Number(line.quantity);
      } else {
        productLineMap.set(line.productId, {
          productId: line.productId,
          requiredQty: Number(line.quantity),
          pickedQty: 0,
        });
      }
    }
    const pickLinesToCreate = Array.from(productLineMap.values());

    const pickList = await tx.pickList.create({
      data: {
        companyId,
        orderId: order.id,
        createdById: creatorId,
        pickNumber,
        status: "OPEN",
        lines: {
          create: pickLinesToCreate,
        },
      },
      include: { lines: true },
    });

    // 5. Automatically create InstallationJob for technician calendar
    const jobCount = await tx.installationJob.count({ where: { companyId } });
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(jobCount + 1).padStart(4, "0")}`;

    // Default scheduled date = 3 days from confirmation if not provided
    const scheduledDate = paymentData.scheduledInstallDate
      ? new Date(paymentData.scheduledInstallDate)
      : new Date(Date.now() + 3 * 86400000);

    const installationJob = await tx.installationJob.create({
      data: {
        companyId,
        orderId: order.id,
        customerId: order.customerId,
        technicianId: paymentData.technicianId || null,
        jobNumber,
        status: "SCHEDULED",
        scheduledAt: scheduledDate,
        confirmedKw: order.capacityKw,
      },
    });

    // 6. Create Notifications for both teams (Warehouse & Technician)
    // Warehouse Notification
    await notifyRole(
      companyId,
      "WAREHOUSE",
      {
        type: "PICK_LIST_CREATED",
        title: "New Pick List Generated",
        message: `Pick list ${pickNumber} created for Order ${order.orderNumber}. Prepare materials for serial scanning.`,
        entityType: "PickList",
        entityId: pickList.id,
      },
      tx
    );

    // Technician Notification
    if (paymentData.technicianId) {
      await createNotification(
        {
          companyId,
          userId: paymentData.technicianId,
          type: "JOB_ASSIGNED",
          title: "New Installation Job Scheduled",
          message: `Job ${jobNumber} (${order.capacityKw} kW) scheduled for ${scheduledDate.toLocaleDateString()}.`,
          entityType: "InstallationJob",
          entityId: installationJob.id,
        },
        tx
      );
    } else {
      await notifyRole(
        companyId,
        "TECHNICIAN",
        {
          type: "JOB_CREATED",
          title: "New Installation Job Ready",
          message: `Job ${jobNumber} (${order.capacityKw} kW) scheduled for ${scheduledDate.toLocaleDateString()}. Pending technician assignment.`,
          entityType: "InstallationJob",
          entityId: installationJob.id,
        },
        tx
      );
    }

    // 7. Record Audit Logs
    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        newValue: { amount: payment.amount, method: payment.method },
        req,
      },
      tx
    );

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "SalesOrder",
        entityId: order.id,
        oldValue: { status: "PENDING_PAYMENT" },
        newValue: { status: "CONFIRMED", pickNumber, jobNumber },
        req,
      },
      tx
    );

    return {
      order: confirmedOrder,
      payment,
      pickList,
      installationJob,
    };
  });
}

module.exports = {
  getOrders,
  getOrderById,
  createOrderFromQuote,
  recordPaymentAndConfirm,
};

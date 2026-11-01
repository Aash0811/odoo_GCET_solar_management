const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole, createNotification } = require("../../utils/notify");
const { generatePaymentReceiptPdf } = require("../../utils/pdf");

function enrichOrderFinancials(order) {
  if (!order) return order;
  const payments = order.payments || [];
  const totalPaid = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(order.totalAmount || 0);
  const outstandingBalance = Math.max(0, totalAmount - totalPaid);
  const percentPaid = totalAmount > 0 ? Number(((totalPaid / totalAmount) * 100).toFixed(1)) : 0;
  const minAdvancePercent = Number(order.minAdvancePercent || 30);
  const minAdvanceAmount = Number(order.minAdvanceAmount || (totalAmount * minAdvancePercent) / 100);
  const isAdvanceSatisfied = totalPaid >= minAdvanceAmount || totalPaid >= totalAmount;
  const advanceDeficit = Math.max(0, minAdvanceAmount - totalPaid);

  return {
    ...order,
    totalPaid,
    outstandingBalance,
    percentPaid,
    minAdvancePercent,
    minAdvanceAmount,
    isAdvanceSatisfied,
    advanceDeficit,
  };
}

function customerIdentityScope(user) {
  if (!user || user.role !== "CUSTOMER") return {};
  const identity = [];
  if (user.email) identity.push({ email: user.email });
  if (user.phone) identity.push({ phone: user.phone });
  return { customer: { OR: identity } };
}

async function getOrders(companyId, filters = {}, user = null) {
  const { status, customerId, q, search, page, limit } = filters;
  const where = { companyId, ...customerIdentityScope(user) };

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const searchQuery = (q || search || "").trim();
  if (searchQuery) {
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: "insensitive" } },
      { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
      { customer: { phone: { contains: searchQuery, mode: "insensitive" } } },
      { customer: { email: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  const hasPagination = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * pageSize;

  const [total, orders] = await prisma.$transaction([
    prisma.salesOrder.count({ where }),
    prisma.salesOrder.findMany({
      where,
      ...(hasPagination ? { skip, take: pageSize } : {}),
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        quote: { select: { id: true, quoteNumber: true, capacityKw: true } },
        payments: { orderBy: { receivedAt: "desc" } },
        milestones: { orderBy: { createdAt: "asc" } },
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
        serialNumbers: {
          select: {
            id: true,
            serial: true,
            status: true,
            warranties: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                warrantyYears: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const enriched = orders.map(enrichOrderFinancials);
  enriched.pagination = {
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return enriched;
}

async function getOrderById(companyId, id, user = null) {
  const order = await prisma.salesOrder.findFirst({
    where: { id, companyId, ...customerIdentityScope(user) },
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
      milestones: { orderBy: { createdAt: "asc" } },
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

  return enrichOrderFinancials(order);
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
    include: {
      payments: true,
      milestones: true,
      customer: true,
    },
  });

  if (existingOrder) {
    return enrichOrderFinancials(existingOrder);
  }

  const count = await prisma.salesOrder.count({ where: { companyId } });
  const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const creatorId =
    actorId ||
    quote.createdById ||
    (await prisma.user.findFirst({ where: { companyId } }))?.id;

  const totalAmount = Number(quote.totalAmount);
  const minAdvancePercent = Number(data.minAdvancePercent || 30);
  const minAdvanceAmount = Math.round((totalAmount * minAdvancePercent) / 100);
  const milestone2Amount = Math.round((totalAmount * 50) / 100);
  const milestone3Amount = totalAmount - minAdvanceAmount - milestone2Amount;

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
        minAdvancePercent,
        minAdvanceAmount,
        notes: data.notes || null,
        milestones: {
          create: [
            {
              companyId,
              name: `Advance Booking Deposit (${minAdvancePercent}%)`,
              stage: "ADVANCE",
              percentage: minAdvancePercent,
              amount: minAdvanceAmount,
              status: "PENDING",
              notes: "Required before releasing material pick list and installation job.",
            },
            {
              companyId,
              name: "Material Delivery at Site (50%)",
              stage: "DELIVERY",
              percentage: 50,
              amount: milestone2Amount,
              status: "PENDING",
              notes: "Payable upon dispatch & delivery of hardware to customer site.",
            },
            {
              companyId,
              name: "Post-Commissioning & Grid Sync (20%)",
              stage: "COMMISSIONING",
              percentage: 20,
              amount: milestone3Amount,
              status: "PENDING",
              notes: "Payable upon successful Discom net-metering & system synchronization.",
            },
          ],
        },
      },
      include: {
        milestones: true,
        customer: true,
      },
    });

    // Update quote status to ACCEPTED
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

    return enrichOrderFinancials(order);
  });
}

// ─────────────────────────────────────────────────────────────
// Payment Recording & Rule 4 Automation Engine
// ─────────────────────────────────────────────────────────────
// Rule: job is released only after configured minimum advance (e.g. 30%) or full payment
// On confirmation:
//   1. Warehouse Pick/Delivery request
//   2. Installation Job on crew schedule
//   3. Project/Job-costing record
// ─────────────────────────────────────────────────────────────
async function recordPaymentAndConfirm(companyId, orderId, paymentData, actorId, req = null, user = null) {
  const order = await getOrderById(companyId, orderId, user);
  const existingPayment = paymentData.paymentId
    ? await prisma.payment.findFirst({
        where: { id: paymentData.paymentId, orderId, companyId },
      })
    : null;

  if (paymentData.paymentId && !existingPayment) {
    const error = new Error("Payment record not found.");
    error.statusCode = 404;
    throw error;
  }

  const creatorId =
    actorId ||
    order.createdById ||
    (await prisma.user.findFirst({ where: { companyId } }))?.id;

  const paymentAmount = Number(existingPayment?.amount ?? paymentData.amount);
  const existingTotalPaid =
    Number(order.totalPaid || 0) -
    (existingPayment?.status === "COMPLETED" && existingPayment.isVerified
      ? paymentAmount
      : 0);
  const newTotalPaid = existingTotalPaid + paymentAmount;
  const orderTotal = Number(order.totalAmount);
  const minAdvanceAmount = Number(order.minAdvanceAmount);
  const isAdvanceSatisfied = newTotalPaid >= minAdvanceAmount || newTotalPaid >= orderTotal;

  // Generate unique sequential receipt number
  const paymentCount = existingPayment
    ? null
    : await prisma.payment.count({ where: { companyId } });
  const receiptNumber =
    existingPayment?.receiptNumber ||
    `REC-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`;

  const isDummy = paymentData.method === 'DUMMY';
  const transactionRef =
    paymentData.transactionRef ||
    (isDummy
      ? `DUMMY-PAY-${Date.now().toString().slice(-8)}`
      : `TXN-${Date.now().toString().slice(-8)}`);
  const notes =
    paymentData.notes ||
    (isDummy ? 'Instant Dummy Payment (Simulation Mode)' : null);

  return await prisma.$transaction(async (tx) => {
    // Customer submissions remain pending until an accountant verifies them.
    let payment = existingPayment;
    if (existingPayment && paymentData.verify) {
      payment = await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "COMPLETED",
          isVerified: true,
          verifiedById: actorId,
          verifiedAt: new Date(),
          notes: paymentData.verificationNotes
            ? `${existingPayment.notes ? existingPayment.notes + " | " : ""}Verified: ${paymentData.verificationNotes}`
            : existingPayment.notes,
        },
      });
    } else if (!existingPayment) {
      payment = await tx.payment.create({
          data: {
            companyId,
            orderId,
            amount: paymentAmount,
            method: paymentData.method,
            transactionRef,
            notes,
            receiptNumber,
            status: "PENDING",
            isVerified: false,
          },
        });
    }

    if (!existingPayment) {
      await recordAuditLog(
        {
          companyId,
          actorId: creatorId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          newValue: {
            amount: payment.amount,
            method: payment.method,
            receiptNumber,
            status: "PENDING",
          },
          req,
        },
        tx
      );

      return {
        order: enrichOrderFinancials(order),
        payment,
        advanceSatisfied: false,
        message: `Payment submitted for accountant verification (Receipt: ${receiptNumber}). The order will be released after verification.`,
      };
    }

    // 2. Update Milestone status based on cumulative total paid
    const milestones = await tx.paymentMilestone.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });

    let remainingAllocation = newTotalPaid;
    for (const m of milestones) {
      const mAmount = Number(m.amount);
      if (remainingAllocation >= mAmount) {
        await tx.paymentMilestone.update({
          where: { id: m.id },
          data: {
            status: "PAID",
            paidAmount: mAmount,
            paidAt: m.paidAt || new Date(),
          },
        });
        remainingAllocation -= mAmount;
      } else if (remainingAllocation > 0) {
        await tx.paymentMilestone.update({
          where: { id: m.id },
          data: {
            status: "PARTIALLY_PAID",
            paidAmount: remainingAllocation,
          },
        });
        remainingAllocation = 0;
      }
    }

    // 3. RULE CHECK: Job is released only after configured minimum advance (e.g. 30%) or full payment
    if (!isAdvanceSatisfied && order.status === "PENDING_PAYMENT") {
      await recordAuditLog(
        {
          companyId,
          actorId: creatorId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          newValue: {
            amount: payment.amount,
            method: payment.method,
            receiptNumber,
            isAdvanceSatisfied: false,
            advanceDeficit: minAdvanceAmount - newTotalPaid,
          },
          req,
        },
        tx
      );

      return {
        order: enrichOrderFinancials({ ...order, totalPaid: newTotalPaid }),
        payment,
        advanceSatisfied: false,
        message: `Partial payment of ₹${paymentAmount.toLocaleString("en-IN")} recorded (Receipt: ${receiptNumber}). Minimum advance required for job release is ₹${minAdvanceAmount.toLocaleString("en-IN")} (${order.minAdvancePercent}%). Outstanding advance deficit: ₹${(minAdvanceAmount - newTotalPaid).toLocaleString("en-IN")}.`,
      };
    }

    // 4. If order is already CONFIRMED or later stage, just record payment
    if (order.status !== "PENDING_PAYMENT") {
      const shouldCloseOrder =
        newTotalPaid >= orderTotal &&
        order.status === "DELIVERED";
      const finalOrder = shouldCloseOrder
        ? await tx.salesOrder.update({
            where: { id: orderId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          })
        : order;

      await recordAuditLog(
        {
          companyId,
          actorId: creatorId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          newValue: { amount: payment.amount, method: payment.method, receiptNumber },
          req,
        },
        tx
      );

      return {
        order: enrichOrderFinancials({ ...finalOrder, totalPaid: newTotalPaid }),
        payment,
        advanceSatisfied: true,
        message: shouldCloseOrder
          ? `Final payment verified. Order ${order.orderNumber} is now financially closed.`
          : `Payment of ₹${paymentAmount.toLocaleString("en-IN")} recorded successfully (Receipt: ${receiptNumber}).`,
      };
    }

    // 5. Order is in PENDING_PAYMENT and advance is satisfied -> CONFIRM ORDER & TRIGGER ALL 3 AUTOMATIONS
    const confirmedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    // Automation 1: Automatically create PickList for warehouse
    const pickListCount = await tx.pickList.count({ where: { companyId } });
    const pickNumber = `PK-${new Date().getFullYear()}-${String(pickListCount + 1).padStart(4, "0")}`;

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

    // Auto-match warehouse based on customer city, fallback to primary active warehouse
    let defaultWarehouse = null;
    if (order.customer?.city) {
      defaultWarehouse = await tx.warehouse.findFirst({
        where: {
          companyId,
          city: { equals: order.customer.city, mode: "insensitive" },
          isActive: true,
        },
      });
    }
    if (!defaultWarehouse) {
      defaultWarehouse = await tx.warehouse.findFirst({
        where: { companyId, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }

    const pickList = await tx.pickList.create({
      data: {
        companyId,
        orderId: order.id,
        createdById: creatorId,
        warehouseId: defaultWarehouse?.id || null,
        pickNumber,
        status: "OPEN",
        lines: {
          create: pickLinesToCreate,
        },
      },
      include: { lines: true },
    });

    // Automation 1b: Reserve available in-stock serial units for this order ("Sold / Allocated - Advance Paid - Not Received by Customer")
    for (const [prodId, lineInfo] of productLineMap.entries()) {
      const prod = await tx.product.findUnique({
        where: { id: prodId },
        select: { id: true, isSerialTracked: true },
      });
      if (prod?.isSerialTracked) {
        const requiredQty = Math.floor(lineInfo.requiredQty);
        const availableSerials = await tx.serialNumber.findMany({
          where: {
            companyId,
            productId: prodId,
            status: "IN_STOCK",
            orderId: null,
          },
          take: requiredQty,
        });

        if (availableSerials.length > 0) {
          await tx.serialNumber.updateMany({
            where: {
              id: { in: availableSerials.map((s) => s.id) },
            },
            data: {
              orderId: order.id,
              customerId: order.customerId,
              status: "RESERVED",
              scannedAt: new Date(),
            },
          });
        }
      }
    }

    // Update pick lines picked count if any serials were reserved
    for (const [prodId] of productLineMap.entries()) {
      const reservedCount = await tx.serialNumber.count({
        where: { orderId: order.id, productId: prodId },
      });
      if (reservedCount > 0) {
        await tx.pickLine.updateMany({
          where: { pickListId: pickList.id, productId: prodId },
          data: { pickedQty: reservedCount },
        });
      }
    }

    // Automation 2: Automatically create InstallationJob for technician calendar
    const jobCount = await tx.installationJob.count({ where: { companyId } });
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(jobCount + 1).padStart(4, "0")}`;

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

    // Automation 3: Automatically create initial Project/Job-costing record
    const bomCost = (order.quote?.lines || []).reduce(
      (sum, l) => sum + Number(l.quantity) * Number(l.unitCost || 0),
      0
    );
    const initialBOMCost = bomCost > 0 ? bomCost : Math.round(orderTotal * 0.65);

    const costEntry = await tx.costEntry.create({
      data: {
        companyId,
        orderId: order.id,
        category: "ESTIMATED_BOM",
        description: `Project BOM Hardware & Materials Estimated Cost (${order.capacityKw} kW System)`,
        amount: initialBOMCost,
      },
    });

    // 6. Notifications for Warehouse & Technician
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
        "ADMIN",
        {
          type: "JOB_CREATED",
          title: "Installation Job Requires Technician Assignment",
          message: `Job ${jobNumber} (${order.capacityKw} kW) for customer ${order.customer?.name} is ready for installation. Please assign a technician.`,
          entityType: "InstallationJob",
          entityId: installationJob.id,
        },
        tx
      );
    }

    // 7. Audit Logs
    await recordAuditLog(
      {
        companyId,
        actorId: creatorId,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        newValue: { amount: payment.amount, method: payment.method, receiptNumber },
        req,
      },
      tx
    );

    await recordAuditLog(
      {
        companyId,
        actorId: creatorId,
        action: "STATUS_CHANGE",
        entityType: "SalesOrder",
        entityId: order.id,
        oldValue: { status: "PENDING_PAYMENT" },
        newValue: { status: "CONFIRMED", pickNumber, jobNumber, costEntryId: costEntry.id },
        req,
      },
      tx
    );

    return {
      order: enrichOrderFinancials(confirmedOrder),
      payment,
      pickList,
      installationJob,
      costEntry,
      advanceSatisfied: true,
      message: `Advance payment verified! Order ${order.orderNumber} confirmed. Warehouse picklist, installation job, and job-costing records released.`,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Accountant Verification
// ─────────────────────────────────────────────────────────────
async function verifyPayment(companyId, orderId, paymentId, actorId, data = {}, req = null) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, orderId, companyId },
  });

  if (!payment) {
    const error = new Error("Payment record not found.");
    error.statusCode = 404;
    throw error;
  }

  if (payment.status !== "PENDING" || payment.isVerified) {
    const error = new Error("Only pending payments can be verified.");
    error.statusCode = 400;
    throw error;
  }

  const result = await recordPaymentAndConfirm(
    companyId,
    orderId,
    { paymentId, verify: true, verificationNotes: data.notes },
    actorId,
    req
  );

  await recordAuditLog({
    companyId,
    actorId,
    action: "UPDATE",
    entityType: "Payment",
    entityId: paymentId,
    newValue: { isVerified: true, verifiedById: actorId },
    metadata: { action: "PAYMENT_VERIFIED" },
    req,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// Payment Reminders
// ─────────────────────────────────────────────────────────────
async function sendPaymentReminder(companyId, orderId, actorId, data = {}, req = null) {
  const order = await getOrderById(companyId, orderId);

  const updated = await prisma.salesOrder.update({
    where: { id: orderId },
    data: { lastReminderSentAt: new Date() },
  });

  // Notify customer if customer account exists
  const customerUser = await prisma.user.findFirst({
    where: { companyId, phone: order.customer.phone },
  });

  if (customerUser) {
    await createNotification({
      companyId,
      userId: customerUser.id,
      type: "PAYMENT_REMINDER",
      title: "Friendly Payment Reminder",
      message: `Payment reminder for Order #${order.orderNumber}. Outstanding balance: ₹${order.outstandingBalance.toLocaleString("en-IN")}. Please clear pending milestone dues.`,
      entityType: "SalesOrder",
      entityId: orderId,
    });
  }

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "SalesOrder",
      entityId: orderId,
      newValue: { lastReminderSentAt: updated.lastReminderSentAt, notes: data.notes },
      metadata: { action: "PAYMENT_REMINDER_SENT" },
      req,
    }
  );

  return {
    success: true,
    message: `Payment reminder successfully dispatched to ${order.customer.name} (${order.customer.phone}). Outstanding balance: ₹${order.outstandingBalance.toLocaleString("en-IN")}.`,
    lastReminderSentAt: updated.lastReminderSentAt,
  };
}

// ─────────────────────────────────────────────────────────────
// PDF Payment Receipt Generator
// ─────────────────────────────────────────────────────────────
async function getPaymentReceiptPdfBuffer(companyId, orderId, paymentId, user = null) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, orderId, companyId },
    include: { milestone: true },
  });

  if (!payment) {
    const error = new Error("Payment record not found.");
    error.statusCode = 404;
    throw error;
  }

  const order = await getOrderById(companyId, orderId);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  return await generatePaymentReceiptPdf(payment, order, company);
}

module.exports = {
  getOrders,
  getOrderById,
  createOrderFromQuote,
  recordPaymentAndConfirm,
  verifyPayment,
  sendPaymentReminder,
  getPaymentReceiptPdfBuffer,
};

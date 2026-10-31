const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole } = require("../../utils/notify");

async function getPickLists(companyId, filters = {}) {
  const { status } = filters;
  const where = { companyId };
  if (status) where.status = status;

  return await prisma.pickList.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
      lines: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getPickListById(companyId, id) {
  const pickList = await prisma.pickList.findFirst({
    where: { id, companyId },
    include: {
      order: {
        include: {
          customer: true,
          serialNumbers: {
            include: { product: true },
          },
        },
      },
      lines: {
        include: { product: true },
      },
    },
  });

  if (!pickList) {
    const error = new Error("Pick list not found.");
    error.statusCode = 404;
    throw error;
  }

  return pickList;
}

async function scanSerial(companyId, data, actorId, req = null) {
  const { orderId, productId, serial } = data;

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, companyId },
    include: { customer: true },
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!product.isSerialTracked) {
    const error = new Error(`Product '${product.name}' is not serial-tracked.`);
    error.statusCode = 400;
    throw error;
  }

  // Check if serial already exists
  const existingSerial = await prisma.serialNumber.findFirst({
    where: { companyId, serial },
  });

  if (existingSerial && existingSerial.orderId && existingSerial.orderId !== orderId) {
    const error = new Error(`Serial '${serial}' is already assigned to another Order.`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    let serialRecord;
    if (existingSerial) {
      serialRecord = await tx.serialNumber.update({
        where: { id: existingSerial.id },
        data: {
          orderId: order.id,
          customerId: order.customerId,
          status: "RESERVED",
          scannedAt: new Date(),
        },
      });
    } else {
      serialRecord = await tx.serialNumber.create({
        data: {
          companyId,
          productId: product.id,
          orderId: order.id,
          customerId: order.customerId,
          serial,
          status: "RESERVED",
          scannedAt: new Date(),
        },
      });
    }

    // Increment pickedQty on PickLine
    const pickLine = await tx.pickLine.findFirst({
      where: {
        pickList: { orderId: order.id },
        productId: product.id,
      },
    });

    if (pickLine) {
      const scannedCount = await tx.serialNumber.count({
        where: { orderId: order.id, productId: product.id },
      });
      await tx.pickLine.update({
        where: { id: pickLine.id },
        data: { pickedQty: scannedCount },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "SERIAL_SCANNED",
        entityType: "SerialNumber",
        entityId: serialRecord.id,
        newValue: { serial, productId: product.id, orderId },
        req,
      },
      tx
    );

    return serialRecord;
  });
}

// Business Rule 5:
// Delivery cannot be validated until every serial-tracked product line has the required
// number of scanned SerialNumber records (unique per serial). Missing serials -> 400 with the list.
//
// Business Rule 6:
// On delivery validation, in ONE transaction auto-create a Warranty per serial:
// startDate = delivery date, endDate = start + product.warrantyYears
async function validateDelivery(companyId, orderId, deliveryData = {}, actorId, req = null) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      customer: true,
      quote: {
        include: {
          lines: {
            include: { product: true },
          },
        },
      },
      serialNumbers: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check required serials for all serial-tracked products
  const serialTrackedLines = (order.quote.lines || []).filter(
    (l) => l.product && l.product.isSerialTracked
  );

  const missing = [];

  for (const line of serialTrackedLines) {
    const requiredCount = Number(line.quantity);
    const scannedCount = order.serialNumbers.filter(
      (sn) => sn.productId === line.productId
    ).length;

    if (scannedCount < requiredCount) {
      missing.push({
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        required: requiredCount,
        scanned: scannedCount,
        missingCount: requiredCount - scannedCount,
      });
    }
  }

  // Business Rule 5 enforcement
  if (missing.length > 0) {
    const error = new Error(
      "Delivery cannot be validated: missing required serial numbers for tracked items."
    );
    error.statusCode = 400;
    error.missing = missing;
    throw error;
  }

  const deliveryDate = deliveryData.deliveryDate
    ? new Date(deliveryData.deliveryDate)
    : new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Create Delivery record
    const deliveryCount = await tx.delivery.count({ where: { companyId } });
    const deliveryNumber = `DEL-${new Date().getFullYear()}-${String(deliveryCount + 1).padStart(4, "0")}`;

    const delivery = await tx.delivery.create({
      data: {
        companyId,
        orderId: order.id,
        customerId: order.customerId,
        deliveryNumber,
        status: "DELIVERED",
        deliveryDate,
        validatedAt: new Date(),
        deliveredAt: deliveryDate,
        deliveredTo: deliveryData.deliveredTo || order.customer.name,
        notes: deliveryData.notes || null,
      },
    });

    // 2. Update SalesOrder status
    await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        status: "DELIVERED",
        deliveredAt: deliveryDate,
      },
    });

    // 3. Mark PickList as COMPLETED
    await tx.pickList.updateMany({
      where: { orderId: order.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // 4. Update SerialNumbers to DELIVERED
    await tx.serialNumber.updateMany({
      where: { orderId: order.id },
      data: {
        status: "DISPATCHED",
        deliveredAt: deliveryDate,
      },
    });

    // 5. Business Rule 6: Auto-create Warranty per serial in the same transaction
    const warrantiesCreated = [];
    for (const sn of order.serialNumbers) {
      const warrantyYears = sn.product?.warrantyYears || 2;
      const startDate = deliveryDate;
      const endDate = new Date(startDate.getTime() + warrantyYears * 365 * 86400000);

      // Check if warranty already exists
      const existingWarranty = await tx.warranty.findUnique({
        where: { serialNumberId: sn.id },
      });

      if (!existingWarranty) {
        const warranty = await tx.warranty.create({
          data: {
            companyId,
            customerId: order.customerId,
            serialNumberId: sn.id,
            status: "ACTIVE",
            startDate,
            endDate,
          },
        });
        warrantiesCreated.push(warranty);
      }
    }

    // 6. Deduct stock and record StockMoves
    for (const line of order.quote.lines) {
      if (line.productId) {
        await tx.product.update({
          where: { id: line.productId },
          data: {
            stockQty: { decrement: line.quantity },
          },
        });

        await tx.stockMove.create({
          data: {
            companyId,
            productId: line.productId,
            orderId: order.id,
            type: "DISPATCH",
            quantity: line.quantity,
            reference: deliveryNumber,
            notes: `Dispatched for order ${order.orderNumber}`,
          },
        });
      }
    }

    // 7. Notify Technician team that materials are on site and install can proceed
    await notifyRole(
      companyId,
      "TECHNICIAN",
      {
        type: "DISPATCH_READY",
        title: "Materials Delivered to Site",
        message: `Delivery ${deliveryNumber} completed for Order ${order.orderNumber}. Installation job is ready to begin.`,
        entityType: "Delivery",
        entityId: delivery.id,
      },
      tx
    );

    // 8. Record AuditLog
    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "DELIVERY_VALIDATED",
        entityType: "Delivery",
        entityId: delivery.id,
        newValue: {
          deliveryNumber,
          warrantiesCount: warrantiesCreated.length,
          serialsCount: order.serialNumbers.length,
        },
        req,
      },
      tx
    );

    return {
      delivery,
      warrantiesCreatedCount: warrantiesCreated.length,
    };
  });
}

module.exports = {
  getPickLists,
  getPickListById,
  scanSerial,
  validateDelivery,
};

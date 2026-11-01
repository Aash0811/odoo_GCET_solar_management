const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole } = require("../../utils/notify");

async function getPickLists(companyId, filters = {}, user = null) {
  const { status } = filters;
  const where = { companyId };
  if (status) where.status = status;
  if (user?.role === "DELIVERY_AGENT") {
    where.deliveryAgentId = user.id;
    where.status = "COMPLETED";
    where.order = { status: { not: "DELIVERED" } };
  }
  if (user?.role === "WAREHOUSE") {
    where.warehouse = { managerId: user.id };
  }

  return await prisma.pickList.findMany({
    where,
    include: {
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          zone: true,
        },
      },
      deliveryAgent: { select: { id: true, name: true, phone: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customer: { select: { id: true, name: true, phone: true, address: true, city: true, state: true, postalCode: true } },
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              deliveryNumber: true,
              status: true,
              deliveryDate: true,
              validatedAt: true,
              deliveredAt: true,
              deliveredTo: true,
              customerAccepted: true,
              customerAcceptedAt: true,
            },
          },
          serialNumbers: {
            select: { id: true, serial: true, status: true, product: { select: { name: true } } },
          },
        },
      },
      lines: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function assignDeliveryAgent(companyId, pickListId, deliveryAgentId, actorId, req = null) {
  const pickList = await prisma.pickList.findFirst({
    where: {
      id: pickListId,
      companyId,
      ...(req?.user?.role === "WAREHOUSE"
        ? { OR: [{ warehouse: null }, { warehouse: { managerId: req.user.id } }] }
        : {}),
    },
  });
  if (!pickList) {
    const error = new Error("Pick list not found.");
    error.statusCode = 404;
    throw error;
  }
  const agent = await prisma.user.findFirst({
    where: { id: deliveryAgentId, companyId, role: "DELIVERY_AGENT", isActive: true },
    select: { id: true, name: true, phone: true },
  });
  if (!agent) {
    const error = new Error("Active delivery agent not found in this company.");
    error.statusCode = 400;
    throw error;
  }
  const updated = await prisma.pickList.update({
    where: { id: pickListId },
    data: { deliveryAgentId, assignedAt: new Date() },
    include: { deliveryAgent: { select: { id: true, name: true, phone: true } } },
  });
  await recordAuditLog({
    companyId,
    actorId,
    action: "DELIVERY_AGENT_ASSIGNED",
    entityType: "PickList",
    entityId: pickListId,
    newValue: { deliveryAgentId },
    req,
  });
  const existingDelivery = await prisma.delivery.findFirst({
    where: { companyId, orderId: pickList.orderId, status: { not: "DELIVERED" } },
  });
  const order = await prisma.salesOrder.findUnique({
    where: { id: pickList.orderId },
    select: { customerId: true, customer: { select: { address: true } } },
  });
  if (!existingDelivery && order) {
    const deliveryCount = await prisma.delivery.count({ where: { companyId } });
    await prisma.delivery.create({
      data: {
        companyId,
        orderId: pickList.orderId,
        customerId: order.customerId,
        deliveryNumber: `DEL-${new Date().getFullYear()}-${String(deliveryCount + 1).padStart(4, "0")}`,
        status: "ASSIGNED",
        deliveryAgentId,
        deliveryAddress: order.customer.address || null,
      },
    });
  } else if (existingDelivery) {
    await prisma.delivery.update({
      where: { id: existingDelivery.id },
      data: {
        deliveryAgentId,
        status: "ASSIGNED",
        deliveryAddress: order?.customer.address || existingDelivery.deliveryAddress,
      },
    });
  }
  await notifyRole(companyId, "ADMIN", {
    type: "DELIVERY_AGENT_ASSIGNED",
    title: "Delivery agent assigned",
    message: `${agent.name} was assigned to pick list ${pickList.pickNumber}.`,
    entityType: "PickList",
    entityId: pickList.id,
  });
  return updated;
}

async function updateDeliveryStatus(companyId, orderId, status, data, actorId, req = null) {
  const delivery = await prisma.delivery.findFirst({
    where: {
      companyId,
      orderId,
      deliveryAgentId: req?.user?.role === "DELIVERY_AGENT" ? req.user.id : undefined,
    },
  });
  if (!delivery) {
    const error = new Error("Assigned delivery not found.");
    error.statusCode = 404;
    throw error;
  }
  const allowedNextStatuses = {
    ASSIGNED: "IN_TRANSIT",
    IN_TRANSIT: "ARRIVED",
  };
  if (allowedNextStatuses[delivery.status] !== status) {
    const error = new Error(`Invalid delivery status transition from ${delivery.status} to ${status}.`);
    error.statusCode = 400;
    throw error;
  }

  // When delivery leaves warehouse (IN_TRANSIT), update serial numbers to DISPATCHED (Loaded on Van)
  if (status === "IN_TRANSIT") {
    if (data.loadedVanSerials && Array.isArray(data.loadedVanSerials) && data.loadedVanSerials.length > 0) {
      const cleanSerials = data.loadedVanSerials.map((s) => String(s).trim());
      await prisma.serialNumber.updateMany({
        where: {
          companyId,
          orderId,
          serial: { in: cleanSerials },
        },
        data: {
          status: "DISPATCHED",
        },
      });
    } else {
      await prisma.serialNumber.updateMany({
        where: { companyId, orderId },
        data: {
          status: "DISPATCHED",
        },
      });
    }
  }

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status,
      deliveryDate: status === "IN_TRANSIT" && !delivery.deliveryDate ? new Date() : delivery.deliveryDate,
      validatedAt: status === "ARRIVED" && !delivery.validatedAt ? new Date() : delivery.validatedAt,
      latitude: data.latitude ?? delivery.latitude,
      longitude: data.longitude ?? delivery.longitude,
    },
  });
  await recordAuditLog({
    companyId,
    actorId,
    action: "DELIVERY_STATUS_CHANGED",
    entityType: "Delivery",
    entityId: delivery.id,
    oldValue: { status: delivery.status },
    newValue: { status },
    req,
  });
  await notifyRole(companyId, "ADMIN", {
    type: "DELIVERY_STATUS_CHANGED",
    title: "Delivery status updated",
    message: `Delivery ${delivery.deliveryNumber} is now ${status}.`,
    entityType: "Delivery",
    entityId: delivery.id,
  });
  return updated;
}

async function getPickListById(companyId, id, user = null) {
  const pickList = await prisma.pickList.findFirst({
    where: {
      id,
      companyId,
      ...(user?.role === "DELIVERY_AGENT" ? { deliveryAgentId: user.id } : {}),
      ...(user?.role === "WAREHOUSE" ? { warehouse: { managerId: user.id } } : {}),
    },
    include: {
      warehouse: true,
      deliveryAgent: { select: { id: true, name: true, phone: true } },
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

  // Attach warehouse stock availability to each pick line
  let warehouseStockMap = new Map();
  if (pickList.warehouseId) {
    const stocks = await prisma.warehouseStock.findMany({
      where: {
        warehouseId: pickList.warehouseId,
        productId: { in: pickList.lines.map((l) => l.productId) },
      },
    });
    stocks.forEach((s) => warehouseStockMap.set(s.productId, Number(s.quantity)));
  }

  const enrichedLines = pickList.lines.map((line) => {
    const whStock = warehouseStockMap.get(line.productId) ?? 0;
    const required = Number(line.requiredQty);
    const picked = Number(line.pickedQty || 0);
    const remaining = Math.max(0, required - picked);
    return {
      ...line,
      warehouseStockQty: whStock,
      hasEnoughWarehouseStock: whStock >= remaining,
      isWarehouseOutOfStock: whStock <= 0,
    };
  });

  return {
    ...pickList,
    lines: enrichedLines,
  };
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

  // WAREHOUSE STOCK RULE ENFORCEMENT:
  // Cannot pick or scan serial if stock is not present in the assigned warehouse!
  const pickList = await prisma.pickList.findFirst({
    where: { orderId: order.id, companyId },
    include: { warehouse: true },
  });

  if (req?.user?.role === "WAREHOUSE" && (!pickList || pickList.warehouse?.managerId !== req.user.id)) {
    const error = new Error("You can only scan stock for pick lists assigned to your warehouse.");
    error.statusCode = 403;
    throw error;
  }

  if (pickList && pickList.warehouseId) {
    const whStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: pickList.warehouseId,
          productId: product.id,
        },
      },
    });

    const availableStock = whStock ? Number(whStock.quantity) : 0;
    const whName = pickList.warehouse ? `${pickList.warehouse.name} (${pickList.warehouse.city} - ${pickList.warehouse.zone})` : 'Warehouse';

    if (availableStock <= 0) {
      const error = new Error(
        `Cannot pick product '${product.name}': stock is NOT PRESENT in warehouse '${whName}'. Available quantity: 0. You cannot pick stock that is not in the warehouse.`
      );
      error.statusCode = 400;
      throw error;
    }
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

/**
 * Pick non-serial items (cables, mounting structures, BOS distribution boxes)
 * Validates against warehouse stock!
 */
async function pickItem(companyId, data, actorId, req = null) {
  const { pickListId, pickLineId, quantity = 1 } = data;
  const numQty = Number(quantity);

  if (isNaN(numQty) || numQty <= 0) {
    const error = new Error("Pick quantity must be greater than 0.");
    error.statusCode = 400;
    throw error;
  }

  const pickList = await prisma.pickList.findFirst({
    where: {
      id: pickListId,
      companyId,
      ...(req?.user?.role === "WAREHOUSE"
        ? { warehouse: { managerId: req.user.id } }
        : {}),
    },
    include: { warehouse: true },
  });

  if (!pickList) {
    const error = new Error("Pick list not found.");
    error.statusCode = 404;
    throw error;
  }

  const pickLine = await prisma.pickLine.findFirst({
    where: { id: pickLineId, pickListId },
    include: { product: true },
  });

  if (!pickLine) {
    const error = new Error("Pick line not found.");
    error.statusCode = 404;
    throw error;
  }

  // WAREHOUSE STOCK RULE: Cannot pick stock not present in warehouse!
  if (pickList.warehouseId) {
    const whStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: pickList.warehouseId,
          productId: pickLine.productId,
        },
      },
    });

    const availableStock = whStock ? Number(whStock.quantity) : 0;
    const currentPicked = Number(pickLine.pickedQty || 0);
    const newPickedTotal = currentPicked + numQty;
    const whName = pickList.warehouse ? `${pickList.warehouse.name} (${pickList.warehouse.city} - ${pickList.warehouse.zone})` : 'Warehouse';

    if (availableStock <= 0) {
      const error = new Error(
        `Cannot pick product '${pickLine.product.name}': stock is NOT PRESENT in warehouse '${whName}'. Available: 0 units. Inward or transfer stock before picking.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (newPickedTotal > availableStock) {
      const error = new Error(
        `Cannot pick: requested total picked quantity (${newPickedTotal}) exceeds available stock in warehouse '${whName}' (${availableStock} available).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedLine = await prisma.pickLine.update({
    where: { id: pickLineId },
    data: {
      pickedQty: { increment: numQty },
    },
    include: { product: true },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "PickLine",
      entityId: pickLineId,
      newValue: { pickedQty: updatedLine.pickedQty },
      req,
    },
    prisma
  );

  return updatedLine;
}

/**
 * Assign or switch warehouse for a pick list
 */
async function assignWarehouseToPickList(companyId, pickListId, warehouseId, actorId, req = null) {
  const pickList = await prisma.pickList.findFirst({
    where: {
      id: pickListId,
      companyId,
      ...(req?.user?.role === "WAREHOUSE"
        ? { OR: [{ warehouse: null }, { warehouse: { managerId: req.user.id } }] }
        : {}),
    },
  });

  if (!pickList) {
    const error = new Error("Pick list not found.");
    error.statusCode = 404;
    throw error;
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      companyId,
      ...(req?.user?.role === "WAREHOUSE" ? { managerId: req.user.id } : {}),
    },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.pickList.update({
    where: { id: pickListId },
    data: { warehouseId },
    include: {
      warehouse: true,
      lines: { include: { product: true } },
    },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "PickList",
      entityId: pickListId,
      newValue: { warehouseId, warehouseName: warehouse.name, city: warehouse.city, zone: warehouse.zone },
      req,
    },
    prisma
  );

  return updated;
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

  if (req?.user?.role === "DELIVERY_AGENT") {
    const assignment = await prisma.pickList.findFirst({
      where: { orderId, companyId, deliveryAgentId: req.user.id },
    });
    if (!assignment) {
      const error = new Error("This delivery is not assigned to you.");
      error.statusCode = 403;
      throw error;
    }
    const assignedDelivery = await prisma.delivery.findFirst({
      where: { companyId, orderId, deliveryAgentId: req.user.id, status: { not: "DELIVERED" } },
      select: { status: true },
    });
    if (!assignedDelivery || assignedDelivery.status !== "ARRIVED") {
      const error = new Error("Mark the delivery as arrived before confirming customer handover.");
      error.statusCode = 400;
      throw error;
    }
    if (!deliveryData.addressConfirmed) {
      const error = new Error("Customer address must be confirmed before handover.");
      error.statusCode = 400;
      throw error;
    }
    const expectedAddress = (order.customer.address || "").trim().toLowerCase();
    const submittedAddress = (deliveryData.deliveryAddress || "").trim().toLowerCase();
    if (!expectedAddress || submittedAddress !== expectedAddress) {
      const error = new Error("Delivery address does not match the customer's registered address.");
      error.statusCode = 400;
      throw error;
    }
    if (!deliveryData.deliveredTo?.trim()) {
      const error = new Error("Recipient name is required for delivery handover.");
      error.statusCode = 400;
      throw error;
    }
    const expectedSerials = order.serialNumbers
      .filter((serial) => ["DISPATCHED", "INSTALLED"].includes(serial.status))
      .map((serial) => serial.serial.toLowerCase());
    const verifiedSerials = [...new Set((deliveryData.verifiedSerials || []).map((serial) => serial.trim().toLowerCase()))];
    const missingSerials = expectedSerials.filter((serial) => !verifiedSerials.includes(serial));
    const unexpectedSerials = verifiedSerials.filter((serial) => !expectedSerials.includes(serial));
    if (missingSerials.length > 0 || unexpectedSerials.length > 0) {
      const error = new Error("Delivery cannot be confirmed until all assigned serialized products are scanned.");
      error.statusCode = 400;
      error.missingSerials = missingSerials;
      error.unexpectedSerials = unexpectedSerials;
      throw error;
    }
  }

  if (order.status === "DELIVERED" || order.deliveredAt) {
    const error = new Error("This order has already been delivered.");
    error.statusCode = 400;
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

    const existingDelivery = await tx.delivery.findFirst({ where: { companyId, orderId: order.id, status: { not: "DELIVERED" } } });
    const delivery = existingDelivery
      ? await tx.delivery.update({
          where: { id: existingDelivery.id },
          data: {
            status: "DELIVERED",
            deliveryDate,
            validatedAt: new Date(),
            deliveredAt: deliveryDate,
            deliveryAgentId: req?.user?.role === "DELIVERY_AGENT" ? req.user.id : existingDelivery.deliveryAgentId,
            deliveredTo: deliveryData.deliveredTo || order.customer.name,
            deliveryAddress: deliveryData.deliveryAddress || order.customer.address || null,
            recipientPhone: deliveryData.recipientPhone || order.customer.phone || null,
            latitude: deliveryData.latitude ?? null,
            longitude: deliveryData.longitude ?? null,
            addressConfirmed: Boolean(deliveryData.addressConfirmed),
            notes: deliveryData.notes || null,
          },
        })
      : await tx.delivery.create({
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
        deliveryAgentId: req?.user?.role === "DELIVERY_AGENT" ? req.user.id : null,
        deliveryAddress: deliveryData.deliveryAddress || order.customer.address || null,
        recipientPhone: deliveryData.recipientPhone || order.customer.phone || null,
        latitude: deliveryData.latitude ?? null,
        longitude: deliveryData.longitude ?? null,
        addressConfirmed: Boolean(deliveryData.addressConfirmed),
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

    // 5. Business Rule 6: Auto-create/sync Warranty per serial according to Installation Date
    const startDate = deliveryDate;

    const warrantiesCreated = [];
    for (const sn of order.serialNumbers) {
      const warrantyYears = sn.product?.warrantyYears || 2;
      const endDate = new Date(startDate.getTime() + warrantyYears * 365 * 86400000);

      const warranty = await tx.warranty.upsert({
        where: { serialNumberId: sn.id },
        update: {
          startDate,
          endDate,
          status: "ACTIVE",
        },
        create: {
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

    // 6. Deduct warehouse stock, product stock, and record StockMoves
    const pickList = await tx.pickList.findFirst({
      where: { orderId: order.id, companyId },
      include: { warehouse: true },
    });
    const warehouseId = pickList?.warehouseId || null;

    for (const line of order.quote.lines) {
      if (line.productId) {
        if (warehouseId) {
          const whStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: line.productId,
              },
            },
          });

          const available = whStock ? Number(whStock.quantity) : 0;
          if (available < Number(line.quantity)) {
            const whDesc = pickList?.warehouse
              ? `'${pickList.warehouse.name}' (${pickList.warehouse.city} - ${pickList.warehouse.zone})`
              : 'the warehouse';
            const error = new Error(
              `Cannot validate delivery: Insufficient stock for product '${line.product?.name || line.description}' in warehouse ${whDesc}. Available: ${available}, Required: ${line.quantity}. You cannot pick stock that is not in the warehouse.`
            );
            error.statusCode = 400;
            throw error;
          }

          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: line.productId,
              },
            },
            data: {
              quantity: { decrement: line.quantity },
            },
          });
        }

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
            warehouseId,
            orderId: order.id,
            type: "DISPATCH",
            quantity: line.quantity,
            reference: deliveryNumber,
            notes: `Dispatched for order ${order.orderNumber}${pickList?.warehouse ? ` from ${pickList.warehouse.name} (${pickList.warehouse.city} - ${pickList.warehouse.zone})` : ''}`,
          },
        });
      }
    }

    // 7. Update InstallationJob and notify Technician team that materials are on site and install can proceed
    const installJob = await tx.installationJob.findFirst({
      where: { orderId: order.id, companyId },
    });
    if (installJob) {
      await tx.installationJob.update({
        where: { id: installJob.id },
        data: {
          notes: installJob.notes
            ? `${installJob.notes}\n[LOGISTICS]: Equipment 100% delivered to customer site. Delivery van empty and verified.`
            : `[LOGISTICS]: Equipment 100% delivered to customer site. Delivery van empty and verified. Ready for technician installation.`,
        },
      });
      if (installJob.technicianId) {
        await createNotification(
          {
            companyId,
            userId: installJob.technicianId,
            type: "DISPATCH_READY",
            title: "Equipment Delivered to Site",
            message: `Equipment for Job ${installJob.jobNumber} (Order ${order.orderNumber}) has been delivered to customer site. Delivery van verified empty. Ready for technician installation.`,
            entityType: "InstallationJob",
            entityId: installJob.id,
          },
          tx
        );
      }
    }

    await notifyRole(
      companyId,
      "TECHNICIAN",
      {
        type: "DISPATCH_READY",
        title: "Materials Delivered to Site",
        message: `Delivery ${deliveryNumber} completed for Order ${order.orderNumber}. All materials scanned and verified at customer house. Installation job is ready to begin.`,
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

/**
 * Universal Barcode / Serial Lookup
 * Scans serial numbers or product SKUs and retrieves real-time equipment status,
 * customer assignment, installation warranty, and warehouse inventory.
 */
async function lookupBarcode(companyId, code) {
  if (!code || !code.trim()) {
    const error = new Error("Barcode / serial code is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanCode = code.trim();

  // 1. Try finding by SerialNumber
  const serialRecord = await prisma.serialNumber.findFirst({
    where: {
      companyId,
      serial: { equals: cleanCode, mode: "insensitive" },
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          unit: true,
          warrantyYears: true,
          salePrice: true,
          costPrice: true,
          productType: true,
          stockQty: true,
          warehouseStocks: {
            include: {
              warehouse: {
                select: { id: true, name: true, code: true, city: true, zone: true },
              },
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          capacityKw: true,
          status: true,
          totalAmount: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              city: true,
              address: true,
            },
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              deliveryNumber: true,
              deliveryDate: true,
              validatedAt: true,
              deliveredTo: true,
              deliveryAgent: {
                select: { id: true, name: true, phone: true },
              },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          installationJobs: {
            select: {
              id: true,
              jobNumber: true,
              status: true,
              scheduledAt: true,
              completedAt: true,
              technician: {
                select: { id: true, name: true, phone: true },
              },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          city: true,
          address: true,
        },
      },
      warranties: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        take: 1,
      },
    },
  });

  if (serialRecord) {
    const warranty = serialRecord.warranties?.[0] || null;
    const latestDelivery = serialRecord.order?.deliveries?.[0] || null;
    const latestJob = serialRecord.order?.installationJobs?.[0] || null;

    let lifecycleStage = "IN_STOCK";
    let lifecycleLabel = "In Warehouse Stock (Available)";
    let lifecycleBadgeColor = "green";
    let lifecycleDescription = "Item is in warehouse inventory, ready to be allocated or dispatched.";

    if (serialRecord.status === "INSTALLED" || latestJob?.status === "COMPLETED") {
      lifecycleStage = "INSTALLED";
      lifecycleLabel = "Installed & Commissioned at Site";
      lifecycleBadgeColor = "purple";
      lifecycleDescription = "Equipment successfully mounted, wired, safety-checked, and commissioned at customer site.";
    } else if (serialRecord.deliveredAt || latestDelivery?.status === "DELIVERED" || serialRecord.order?.status === "DELIVERED") {
      lifecycleStage = "DELIVERED";
      lifecycleLabel = "Delivered at Customer Site (Awaiting Technician Installation)";
      lifecycleBadgeColor = "emerald";
      lifecycleDescription = "Van sweep complete (0 items left in vehicle). Equipment safely delivered at customer home. Awaiting technician arrival.";
    } else if (serialRecord.status === "DISPATCHED" || latestDelivery?.status === "IN_TRANSIT" || latestDelivery?.status === "ARRIVED") {
      lifecycleStage = "IN_TRANSIT";
      lifecycleLabel = "In Transit on Van (Traveling towards Customer House)";
      lifecycleBadgeColor = "blue";
      lifecycleDescription = "Scanned and loaded into delivery van. Traveling towards customer premises.";
    } else if (serialRecord.status === "RESERVED" || serialRecord.orderId) {
      lifecycleStage = "SOLD_ALLOCATED";
      lifecycleLabel = "Sold / Allocated (Advance Paid - Not Yet Received by Customer)";
      lifecycleBadgeColor = "amber";
      lifecycleDescription = "Customer survey approved and advance deposit paid. Unit reserved for order, pending delivery van loading.";
    }

    return {
      type: "SERIAL",
      found: true,
      serial: serialRecord.serial,
      status: serialRecord.status,
      lifecycleStage,
      lifecycleLabel,
      lifecycleBadgeColor,
      lifecycleDescription,
      scannedAt: serialRecord.scannedAt,
      deliveredAt: serialRecord.deliveredAt,
      installedAt: serialRecord.installedAt,
      product: serialRecord.product,
      order: serialRecord.order,
      delivery: latestDelivery,
      installationJob: latestJob,
      customer: serialRecord.customer,
      warranty,
      warehouseStocks: (serialRecord.product?.warehouseStocks || []).map((ws) => ({
        warehouseId: ws.warehouseId,
        warehouseName: ws.warehouse.name,
        city: ws.warehouse.city,
        zone: ws.warehouse.zone,
        quantity: Number(ws.quantity),
      })),
    };
  }

  // 2. Try finding by Product SKU or ID
  const productRecord = await prisma.product.findFirst({
    where: {
      companyId,
      OR: [
        { sku: { equals: cleanCode, mode: "insensitive" } },
        { id: cleanCode },
      ],
    },
    include: {
      warehouseStocks: {
        include: {
          warehouse: {
            select: { id: true, name: true, code: true, city: true, zone: true },
          },
        },
      },
    },
  });

  if (productRecord) {
    return {
      type: "PRODUCT_SKU",
      found: true,
      sku: productRecord.sku,
      lifecycleStage: "IN_STOCK",
      lifecycleLabel: "Catalog Item (Warehouse Stock)",
      lifecycleBadgeColor: "green",
      lifecycleDescription: "Standard product SKU. Use Inward (+ Input) or Outward (- Output) to manage warehouse stock levels.",
      product: {
        id: productRecord.id,
        name: productRecord.name,
        sku: productRecord.sku,
        category: productRecord.category,
        unit: productRecord.unit,
        isSerialTracked: productRecord.isSerialTracked,
        salePrice: productRecord.salePrice,
        costPrice: productRecord.costPrice,
        stockQty: productRecord.stockQty,
        warrantyYears: productRecord.warrantyYears,
      },
      warehouseStocks: productRecord.warehouseStocks.map((ws) => ({
        warehouseId: ws.warehouseId,
        warehouseName: ws.warehouse.name,
        city: ws.warehouse.city,
        zone: ws.warehouse.zone,
        quantity: Number(ws.quantity),
      })),
    };
  }

  return {
    type: "UNKNOWN",
    found: false,
    code: cleanCode,
    message: `No active serial unit or product SKU matching '${cleanCode}' found in company database.`,
  };
}

/**
 * Get all product & equipment items with their unique barcodes and serial numbers
 */
async function getItemBarcodes(companyId, search = "") {
  const where = { companyId, isActive: true };
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { sku: { contains: s, mode: "insensitive" } },
      { category: { contains: s, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      unit: true,
      isSerialTracked: true,
      stockQty: true,
      costPrice: true,
      salePrice: true,
      serialNumbers: {
        where: { status: "IN_STOCK" },
        select: {
          id: true,
          serial: true,
          status: true,
          scannedAt: true,
        },
        take: 50,
      },
      _count: {
        select: {
          serialNumbers: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return products.map((p) => ({
    ...p,
    masterBarcode: p.sku,
    availableSerials: p.serialNumbers.map((s) => s.serial),
    totalSerialsCount: p._count.serialNumbers,
  }));
}

/**
 * Generate and assign unique serial codes for any product on demand
 */
async function seedUniqueItemCodes(companyId, data = {}) {
  const { productId, count = 5 } = data;
  const currentYear = new Date().getFullYear();

  let products = [];
  if (productId) {
    const single = await prisma.product.findFirst({
      where: { id: productId, companyId, isSerialTracked: true },
      include: { serialNumbers: true },
    });
    if (single) products = [single];
  } else {
    products = await prisma.product.findMany({
      where: { companyId, isSerialTracked: true },
      include: { serialNumbers: true },
    });
  }

  let createdCount = 0;
  for (const prod of products) {
    const existing = new Set(prod.serialNumbers.map((s) => s.serial));
    const cleanSku = prod.sku.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const batch = [];
    let counter = 1;
    while (batch.length < Number(count)) {
      const candidate = `SN-${cleanSku}-${currentYear}-${String(counter).padStart(4, "0")}`;
      if (!existing.has(candidate)) {
        batch.push({
          companyId,
          productId: prod.id,
          serial: candidate,
          status: "IN_STOCK",
        });
        existing.add(candidate);
      }
      counter++;
    }

    if (batch.length > 0) {
      await prisma.serialNumber.createMany({
        data: batch,
        skipDuplicates: true,
      });
      createdCount += batch.length;
    }
  }

  return { createdCount };
}

/**
 * Register a custom barcode / serial number directly to a product in the warehouse inventory
 */
async function registerCustomSerial(companyId, { productId, serial }) {
  if (!serial || !serial.trim()) {
    const error = new Error("Serial number text is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanSerial = serial.trim();

  // If productId provided, verify it; otherwise match prefix or pick first serial-tracked product
  let targetProduct = null;
  if (productId) {
    targetProduct = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });
  }

  if (!targetProduct) {
    // Try matching prefix against SKU
    const allProducts = await prisma.product.findMany({
      where: { companyId, isSerialTracked: true },
    });
    for (const p of allProducts) {
      const cleanSku = p.sku.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (cleanSerial.toUpperCase().includes(cleanSku) || cleanSerial.toUpperCase().includes(p.sku.toUpperCase())) {
        targetProduct = p;
        break;
      }
    }
    if (!targetProduct && allProducts.length > 0) {
      targetProduct = allProducts[0];
    }
  }

  if (!targetProduct) {
    const error = new Error("No serial-tracked product found in company catalog.");
    error.statusCode = 404;
    throw error;
  }

  // Check if serial already exists
  const existing = await prisma.serialNumber.findFirst({
    where: { companyId, serial: cleanSerial },
    include: { product: true },
  });

  if (existing) {
    return {
      isNew: false,
      serial: existing.serial,
      status: existing.status,
      product: existing.product,
    };
  }

  const created = await prisma.serialNumber.create({
    data: {
      companyId,
      productId: targetProduct.id,
      serial: cleanSerial,
      status: "IN_STOCK",
    },
    include: { product: true },
  });

  return {
    isNew: true,
    serial: created.serial,
    status: created.status,
    product: created.product,
  };
}

module.exports = {
  getPickLists,
  getPickListById,
  scanSerial,
  pickItem,
  assignWarehouseToPickList,
  validateDelivery,
  updateDeliveryStatus,
  assignDeliveryAgent,
  lookupBarcode,
  getItemBarcodes,
  seedUniqueItemCodes,
  registerCustomSerial,
};

const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");

/**
 * List all warehouses for the company, with stock summary and assigned zone manager
 */
async function getWarehouses(companyId, filters = {}) {
  const { city, zone, isActive, search } = filters;
  const where = { companyId };

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }
  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }
  if (zone) {
    where.zone = { contains: zone, mode: "insensitive" };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { zone: { contains: search, mode: "insensitive" } },
    ];
  }

  const warehouses = await prisma.warehouse.findMany({
    where,
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      _count: {
        select: {
          stocks: true,
          pickLists: true,
          transfersOut: true,
          transfersIn: true,
        },
      },
      stocks: {
        select: {
          quantity: true,
          productId: true,
        },
      },
    },
    orderBy: [{ city: "asc" }, { zone: "asc" }],
  });

  return warehouses.map((wh) => {
    const totalUnits = wh.stocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0);
    const inStockSkuCount = wh.stocks.filter((s) => Number(s.quantity) > 0).length;
    const { stocks, ...rest } = wh;
    return {
      ...rest,
      totalUnits,
      inStockSkuCount,
      totalSkuCount: wh._count.stocks,
    };
  });
}

/**
 * Get warehouse detail by ID with stock inventory and manager
 */
async function getWarehouseById(companyId, id) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, companyId },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      stocks: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              unit: true,
              productType: true,
              isSerialTracked: true,
              salePrice: true,
              costPrice: true,
              stockQty: true,
            },
          },
        },
        orderBy: {
          product: { name: "asc" },
        },
      },
      _count: {
        select: {
          pickLists: true,
          stockMoves: true,
          transfersOut: true,
          transfersIn: true,
        },
      },
    },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  return warehouse;
}

/**
 * Get potential warehouse / zone managers (users with role WAREHOUSE or ADMIN)
 */
async function getWarehouseManagers(companyId) {
  return await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      role: { in: ["ADMIN", "WAREHOUSE"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a new warehouse variant
 * Uniquely identifies the warehouse according to city and zone!
 */
async function createWarehouse(companyId, data, actorId, req = null) {
  const { name, code, city, zone, address, contactPerson, phone, managerId } = data;

  if (!name || !code || !city || !zone) {
    const error = new Error("Name, code, city, and zone are required fields.");
    error.statusCode = 400;
    throw error;
  }

  // Check unique city and zone for company
  const existingCityZone = await prisma.warehouse.findFirst({
    where: {
      companyId,
      city: { equals: city.trim(), mode: "insensitive" },
      zone: { equals: zone.trim(), mode: "insensitive" },
    },
  });

  if (existingCityZone) {
    const error = new Error(
      `A warehouse uniquely identified by City '${city}' and Zone '${zone}' already exists (${existingCityZone.name} - ${existingCityZone.code}). Each city and zone combination must uniquely identify only one warehouse.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Check unique code for company
  const existingCode = await prisma.warehouse.findFirst({
    where: {
      companyId,
      code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
    },
  });

  if (existingCode) {
    const error = new Error(`Warehouse code '${code}' is already in use by '${existingCode.name}'.`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.create({
      data: {
        companyId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city.trim(),
        zone: zone.trim(),
        address: address ? address.trim() : null,
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone ? phone.trim() : null,
        managerId: managerId || null,
        isActive: true,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
    });

    // Seed empty stock lines for all company products
    const products = await tx.product.findMany({
      where: { companyId },
      select: { id: true },
    });

    if (products.length > 0) {
      await tx.warehouseStock.createMany({
        data: products.map((p) => ({
          warehouseId: warehouse.id,
          productId: p.id,
          quantity: 0,
          minQuantity: 5,
        })),
        skipDuplicates: true,
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Warehouse",
        entityId: warehouse.id,
        newValue: {
          name: warehouse.name,
          code: warehouse.code,
          city: warehouse.city,
          zone: warehouse.zone,
          managerId: warehouse.managerId,
        },
        req,
      },
      tx
    );

    return warehouse;
  });
}

/**
 * Create multiple warehouse variants in a single city (Multi-Zone setup)
 * Each zone has its own distinct physical address, code, and assigned zone manager.
 * Strictly Admin feature.
 */
async function createMultiZoneWarehouses(companyId, payload, actorId, req = null) {
  const { city, zones } = payload || {};

  if (!city || typeof city !== "string" || !city.trim()) {
    const error = new Error("City is required for multi-zone setup.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(zones) || zones.length === 0) {
    const error = new Error("At least one zone variant is required.");
    error.statusCode = 400;
    throw error;
  }

  const trimmedCity = city.trim();
  const cityCodePrefix = (trimmedCity.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3) || "WH").toUpperCase();

  // Validate zone names uniqueness within this request
  const seenZones = new Set();
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const zoneName = (z.zone || "").trim();
    if (!zoneName) {
      const error = new Error(`Zone #${i + 1} must have a zone identifier (e.g., 'Zone 1', 'North Zone').`);
      error.statusCode = 400;
      throw error;
    }
    const lowerZone = zoneName.toLowerCase();
    if (seenZones.has(lowerZone)) {
      const error = new Error(
        `Duplicate zone variant '${zoneName}' detected in submission for city '${trimmedCity}'. Each zone in a city must be distinct.`
      );
      error.statusCode = 400;
      throw error;
    }
    seenZones.add(lowerZone);
  }

  // Check against existing warehouses in DB for this city
  const existingWarehousesInCity = await prisma.warehouse.findMany({
    where: {
      companyId,
      city: { equals: trimmedCity, mode: "insensitive" },
    },
    select: { zone: true, code: true, name: true },
  });

  const existingZoneSet = new Set(existingWarehousesInCity.map((w) => w.zone.toLowerCase()));
  for (const z of zones) {
    const zoneName = z.zone.trim();
    if (existingZoneSet.has(zoneName.toLowerCase())) {
      const error = new Error(
        `Zone '${zoneName}' already exists in city '${trimmedCity}'. Please provide a different zone name or update the existing zone.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Check code collisions and generate defaults
  const existingCompanyCodes = await prisma.warehouse.findMany({
    where: { companyId },
    select: { code: true },
  });
  const usedCodes = new Set(existingCompanyCodes.map((w) => w.code.toUpperCase()));

  const preparedZones = [];
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const zoneName = z.zone.trim();
    const whName = z.name && z.name.trim() ? z.name.trim() : `${trimmedCity} ${zoneName} Hub`;

    let whCode = z.code && z.code.trim() ? z.code.trim().toUpperCase() : "";
    if (!whCode) {
      const cleanZoneSuffix = zoneName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || `${i + 1}`;
      let candidateCode = `WH-${cityCodePrefix}-${cleanZoneSuffix}`;
      let counter = 1;
      while (usedCodes.has(candidateCode)) {
        candidateCode = `WH-${cityCodePrefix}-${cleanZoneSuffix}-${counter}`;
        counter++;
      }
      whCode = candidateCode;
    } else {
      if (usedCodes.has(whCode)) {
        const error = new Error(`Warehouse code '${whCode}' is already in use.`);
        error.statusCode = 400;
        throw error;
      }
    }
    usedCodes.add(whCode);

    preparedZones.push({
      name: whName,
      code: whCode,
      city: trimmedCity,
      zone: zoneName,
      address: z.address ? z.address.trim() : null,
      contactPerson: z.contactPerson ? z.contactPerson.trim() : null,
      phone: z.phone ? z.phone.trim() : null,
      managerId: z.managerId || null,
      isActive: z.isActive !== false,
    });
  }

  // Execute in transaction
  return await prisma.$transaction(async (tx) => {
    // Seed stock for all company products
    const products = await tx.product.findMany({
      where: { companyId },
      select: { id: true },
    });

    const createdWarehouses = [];
    for (const pz of preparedZones) {
      const created = await tx.warehouse.create({
        data: {
          companyId,
          name: pz.name,
          code: pz.code,
          city: pz.city,
          zone: pz.zone,
          address: pz.address,
          contactPerson: pz.contactPerson,
          phone: pz.phone,
          managerId: pz.managerId,
          isActive: pz.isActive,
        },
        include: {
          manager: {
            select: { id: true, name: true, email: true, phone: true, role: true },
          },
        },
      });

      if (products.length > 0) {
        await tx.warehouseStock.createMany({
          data: products.map((p) => ({
            warehouseId: created.id,
            productId: p.id,
            quantity: 0,
            minQuantity: 5,
          })),
          skipDuplicates: true,
        });
      }

      await recordAuditLog(
        {
          companyId,
          actorId,
          action: "CREATE",
          entityType: "Warehouse",
          entityId: created.id,
          newValue: {
            name: created.name,
            code: created.code,
            city: created.city,
            zone: created.zone,
            address: created.address,
            managerId: created.managerId,
          },
          req,
        },
        tx
      );

      createdWarehouses.push(created);
    }

    return createdWarehouses;
  });
}

/**
 * Update an existing warehouse (dynamic city/zone, manager, metadata)
 */
async function updateWarehouse(companyId, id, data, actorId, req = null) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, companyId },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  const { name, code, city, zone, address, contactPerson, phone, isActive, managerId } = data;

  // If city or zone changed, check uniqueness across other warehouses
  if (
    (city && city.trim().toLowerCase() !== warehouse.city.toLowerCase()) ||
    (zone && zone.trim().toLowerCase() !== warehouse.zone.toLowerCase())
  ) {
    const targetCity = (city || warehouse.city).trim();
    const targetZone = (zone || warehouse.zone).trim();

    const duplicate = await prisma.warehouse.findFirst({
      where: {
        companyId,
        id: { not: id },
        city: { equals: targetCity, mode: "insensitive" },
        zone: { equals: targetZone, mode: "insensitive" },
      },
    });

    if (duplicate) {
      const error = new Error(
        `Another warehouse uniquely identified by City '${targetCity}' and Zone '${targetZone}' already exists (${duplicate.name}).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // If code changed, check uniqueness
  if (code && code.trim().toUpperCase() !== warehouse.code.toUpperCase()) {
    const targetCode = code.trim().toUpperCase();
    const duplicateCode = await prisma.warehouse.findFirst({
      where: {
        companyId,
        id: { not: id },
        code: { equals: targetCode, mode: "insensitive" },
      },
    });

    if (duplicateCode) {
      const error = new Error(`Warehouse code '${targetCode}' is already in use by '${duplicateCode.name}'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await prisma.warehouse.update({
    where: { id },
    data: {
      name: name !== undefined ? name.trim() : undefined,
      code: code !== undefined ? code.trim().toUpperCase() : undefined,
      city: city !== undefined ? city.trim() : undefined,
      zone: zone !== undefined ? zone.trim() : undefined,
      address: address !== undefined ? address?.trim() || null : undefined,
      contactPerson: contactPerson !== undefined ? contactPerson?.trim() || null : undefined,
      phone: phone !== undefined ? phone?.trim() || null : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      managerId: managerId !== undefined ? managerId || null : undefined,
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true, phone: true, role: true },
      },
    },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "Warehouse",
      entityId: id,
      oldValue: warehouse,
      newValue: updated,
      req,
    },
    prisma
  );

  return updated;
}

/**
 * Delete a warehouse (Admin only)
 * Enforces safety: Cannot delete if active pick lists or pending transfers exist
 */
async function deleteWarehouse(companyId, id, actorId, req = null) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, companyId },
    include: {
      _count: {
        select: {
          stocks: true,
          pickLists: true,
        },
      },
    },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check for active pick lists
  const activePickLists = await prisma.pickList.count({
    where: {
      warehouseId: id,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });

  if (activePickLists > 0) {
    const error = new Error(
      `Cannot delete warehouse '${warehouse.name}' (${warehouse.city} - ${warehouse.zone}) because it is assigned to ${activePickLists} active pick list(s). Please complete or reassign them first.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Check for pending transfers
  const pendingTransfers = await prisma.stockTransferRequest.count({
    where: {
      OR: [{ fromWarehouseId: id }, { toWarehouseId: id }],
      status: "REQUESTED",
    },
  });

  if (pendingTransfers > 0) {
    const error = new Error(
      `Cannot delete warehouse '${warehouse.name}' because it has ${pendingTransfers} pending stock transfer request(s). Please approve or reject them first.`
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // Delete stock records
    await tx.warehouseStock.deleteMany({
      where: { warehouseId: id },
    });

    // Delete associated transfer requests
    await tx.stockTransferRequest.deleteMany({
      where: {
        OR: [{ fromWarehouseId: id }, { toWarehouseId: id }],
      },
    });

    // Unlink completed pick lists to allow deletion
    await tx.pickList.updateMany({
      where: { warehouseId: id },
      data: { warehouseId: null },
    });

    // Unlink historical stock moves
    await tx.stockMove.updateMany({
      where: { warehouseId: id },
      data: { warehouseId: null },
    });

    // Delete the warehouse
    const deleted = await tx.warehouse.delete({
      where: { id },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "DELETE",
        entityType: "Warehouse",
        entityId: id,
        oldValue: {
          name: warehouse.name,
          code: warehouse.code,
          city: warehouse.city,
          zone: warehouse.zone,
        },
        req,
      },
      tx
    );

    return deleted;
  });
}

/**
 * Get all stock for a warehouse with optional search
 */
async function getWarehouseStock(companyId, warehouseId, search = "") {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  const whereProduct = { companyId };
  if (search) {
    whereProduct.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  // Ensure every active product has a warehouseStock entry
  const allProducts = await prisma.product.findMany({
    where: whereProduct,
    include: {
      warehouseStocks: {
        where: { warehouseId },
      },
    },
    orderBy: { name: "asc" },
  });

  return allProducts.map((p) => {
    const stockRecord = p.warehouseStocks[0];
    return {
      stockId: stockRecord?.id || null,
      warehouseId,
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      productType: p.productType,
      isSerialTracked: p.isSerialTracked,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      warehouseQuantity: stockRecord ? Number(stockRecord.quantity) : 0,
      minQuantity: stockRecord ? Number(stockRecord.minQuantity) : 0,
      totalCompanyStock: Number(p.stockQty),
      isLowStock: stockRecord ? Number(stockRecord.quantity) <= Number(stockRecord.minQuantity) : true,
      isOutOfStock: stockRecord ? Number(stockRecord.quantity) <= 0 : true,
    };
  });
}

/**
 * Add or adjust stock present in a warehouse
 * Operation: "ADD" (inward stock) or "SET" (audit count / inventory recount)
 */
async function addOrAdjustStock(companyId, warehouseId, stockData, actorId, req = null) {
  const { productId, quantity, operation = "ADD", notes, reference } = stockData;

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty < 0) {
    const error = new Error("Stock quantity must be a non-negative number.");
    error.statusCode = 400;
    throw error;
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
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

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
    });

    const oldQty = existing ? Number(existing.quantity) : 0;
    let newQty = 0;
    let delta = 0;

    if (operation === "SET") {
      newQty = numQty;
      delta = newQty - oldQty;
    } else {
      // ADD
      newQty = oldQty + numQty;
      delta = numQty;
    }

    const updatedStock = await tx.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      update: {
        quantity: newQty,
      },
      create: {
        warehouseId,
        productId,
        quantity: newQty,
        minQuantity: 5,
      },
    });

    // Update aggregate product stockQty
    if (delta !== 0) {
      if (delta > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stockQty: { increment: delta } },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { stockQty: { decrement: Math.abs(delta) } },
        });
      }

      // Record StockMove audit
      await tx.stockMove.create({
        data: {
          companyId,
          productId,
          warehouseId,
          type: delta > 0 ? "PURCHASE" : "ADJUSTMENT",
          quantity: Math.abs(delta),
          reference: reference || `WH-STOCK-${warehouse.code}`,
          notes: notes || `${operation === "SET" ? "Inventory Count Set" : "Stock Inward"} at ${warehouse.name} (${warehouse.city} - ${warehouse.zone})`,
        },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "WarehouseStock",
        entityId: updatedStock.id,
        oldValue: { quantity: oldQty },
        newValue: { quantity: newQty, operation, delta },
        metadata: { warehouseId, productId, warehouseName: warehouse.name, productName: product.name },
        req,
      },
      tx
    );

    return {
      ...updatedStock,
      oldQuantity: oldQty,
      newQuantity: newQty,
      delta,
      productName: product.name,
      warehouseName: warehouse.name,
    };
  });
}

/**
 * Check warehouse stock against pick list requirements.
 * RULE: We should not be able to pick the stock that is not present in the warehouse!
 */
async function checkWarehouseStockForPickList(companyId, warehouseId, pickListId) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  const pickList = await prisma.pickList.findFirst({
    where: { id: pickListId, companyId },
    include: {
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

  const lineResults = [];
  let allStockAvailable = true;

  for (const line of pickList.lines) {
    const stock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId: line.productId,
        },
      },
    });

    const availableQty = stock ? Number(stock.quantity) : 0;
    const requiredQty = Number(line.requiredQty);
    const pickedQty = Number(line.pickedQty || 0);
    const remainingToPick = Math.max(0, requiredQty - pickedQty);
    const hasEnoughStock = availableQty >= remainingToPick;
    const isOutOfStock = availableQty <= 0;

    if (!hasEnoughStock) {
      allStockAvailable = false;
    }

    lineResults.push({
      lineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      sku: line.product.sku,
      category: line.product.category,
      isSerialTracked: line.product.isSerialTracked,
      requiredQty,
      pickedQty,
      remainingToPick,
      warehouseAvailableQty: availableQty,
      hasEnoughStock,
      isOutOfStock,
      deficiency: hasEnoughStock ? 0 : remainingToPick - availableQty,
    });
  }

  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      city: warehouse.city,
      zone: warehouse.zone,
    },
    pickListId,
    canPick: allStockAvailable,
    missingItemsCount: lineResults.filter((l) => !l.hasEnoughStock).length,
    lines: lineResults,
  };
}

// ============================================================
// INTER-WAREHOUSE STOCK TRANSFER REQUESTS
// ============================================================

/**
 * Request stock transfer from another warehouse
 */
async function createTransferRequest(companyId, data, actorId, req = null) {
  const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = data;

  if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
    const error = new Error("fromWarehouseId, toWarehouseId, productId, and quantity are required.");
    error.statusCode = 400;
    throw error;
  }

  if (fromWarehouseId === toWarehouseId) {
    const error = new Error("Source warehouse and Destination warehouse cannot be the same.");
    error.statusCode = 400;
    throw error;
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    const error = new Error("Transfer quantity must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  // Verify source warehouse
  const fromWh = await prisma.warehouse.findFirst({
    where: { id: fromWarehouseId, companyId },
  });
  if (!fromWh) {
    const error = new Error("Source warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  // Verify destination warehouse
  const toWh = await prisma.warehouse.findFirst({
    where: { id: toWarehouseId, companyId },
  });
  if (!toWh) {
    const error = new Error("Destination warehouse not found.");
    error.statusCode = 404;
    throw error;
  }

  // Verify product
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check available stock in source warehouse
  const sourceStock = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: fromWarehouseId,
        productId,
      },
    },
  });

  const availableSourceQty = sourceStock ? Number(sourceStock.quantity) : 0;
  if (availableSourceQty < numQty) {
    const error = new Error(
      `Insufficient stock in source warehouse '${fromWh.name}'. Requested: ${numQty}, Available: ${availableSourceQty}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const year = new Date().getFullYear();
  const count = await prisma.stockTransferRequest.count({
    where: {
      companyId,
      transferNumber: { startsWith: `TRF-${year}-` },
    },
  });
  const transferNumber = `TRF-${year}-${String(count + 1).padStart(4, "0")}`;

  const transfer = await prisma.stockTransferRequest.create({
    data: {
      companyId,
      transferNumber,
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity: numQty,
      status: "REQUESTED",
      notes: notes || null,
      requestedById: actorId,
    },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      product: true,
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "CREATE",
      entityType: "StockTransferRequest",
      entityId: transfer.id,
      newValue: {
        transferNumber,
        fromWarehouse: fromWh.name,
        toWarehouse: toWh.name,
        product: product.name,
        quantity: numQty,
      },
      req,
    },
    prisma
  );

  return transfer;
}

/**
 * List stock transfer requests with filtering
 */
async function listTransferRequests(companyId, filters = {}) {
  const { status, warehouseId, search } = filters;
  const where = { companyId };

  if (status) {
    where.status = status;
  }

  if (warehouseId) {
    where.OR = [
      { fromWarehouseId: warehouseId },
      { toWarehouseId: warehouseId },
    ];
  }

  if (search) {
    where.OR = [
      { transferNumber: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { fromWarehouse: { name: { contains: search, mode: "insensitive" } } },
      { toWarehouse: { name: { contains: search, mode: "insensitive" } } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  return await prisma.stockTransferRequest.findMany({
    where,
    include: {
      fromWarehouse: {
        select: { id: true, name: true, code: true, city: true, zone: true },
      },
      toWarehouse: {
        select: { id: true, name: true, code: true, city: true, zone: true },
      },
      product: {
        select: { id: true, name: true, sku: true, category: true, unit: true },
      },
      requestedBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}

/**
 * Approve & complete a stock transfer request
 * Atomically deducts stock from source warehouse and adds to destination warehouse
 */
async function approveAndCompleteTransfer(companyId, transferId, actorId, req = null) {
  const transfer = await prisma.stockTransferRequest.findFirst({
    where: { id: transferId, companyId },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      product: true,
    },
  });

  if (!transfer) {
    const error = new Error("Stock transfer request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (transfer.status !== "REQUESTED") {
    const error = new Error(`Cannot approve a transfer with status '${transfer.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const transferQty = Number(transfer.quantity);

  return await prisma.$transaction(async (tx) => {
    // 1. Re-check source warehouse stock
    const sourceStock = await tx.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: transfer.fromWarehouseId,
          productId: transfer.productId,
        },
      },
    });

    const currentSourceQty = sourceStock ? Number(sourceStock.quantity) : 0;
    if (currentSourceQty < transferQty) {
      throw new Error(
        `Cannot fulfill transfer. Source warehouse '${transfer.fromWarehouse.name}' currently has ${currentSourceQty} units available, but ${transferQty} is required.`
      );
    }

    // 2. Decrement source warehouse stock
    await tx.warehouseStock.update({
      where: {
        warehouseId_productId: {
          warehouseId: transfer.fromWarehouseId,
          productId: transfer.productId,
        },
      },
      data: {
        quantity: { decrement: transferQty },
      },
    });

    // 3. Increment destination warehouse stock (upsert)
    await tx.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: transfer.toWarehouseId,
          productId: transfer.productId,
        },
      },
      update: {
        quantity: { increment: transferQty },
      },
      create: {
        warehouseId: transfer.toWarehouseId,
        productId: transfer.productId,
        quantity: transferQty,
        minQuantity: 5,
      },
    });

    // 4. Create StockMove for source (DISPATCH out)
    await tx.stockMove.create({
      data: {
        companyId,
        productId: transfer.productId,
        warehouseId: transfer.fromWarehouseId,
        type: "DISPATCH",
        quantity: transferQty,
        reference: transfer.transferNumber,
        notes: `Transfer out to ${transfer.toWarehouse.name} (${transfer.toWarehouse.city} - ${transfer.toWarehouse.zone})`,
      },
    });

    // 5. Create StockMove for destination (PURCHASE in)
    await tx.stockMove.create({
      data: {
        companyId,
        productId: transfer.productId,
        warehouseId: transfer.toWarehouseId,
        type: "PURCHASE",
        quantity: transferQty,
        reference: transfer.transferNumber,
        notes: `Transfer in from ${transfer.fromWarehouse.name} (${transfer.fromWarehouse.city} - ${transfer.fromWarehouse.zone})`,
      },
    });

    // 6. Mark transfer request as COMPLETED
    const completedTransfer = await tx.stockTransferRequest.update({
      where: { id: transferId },
      data: {
        status: "COMPLETED",
        approvedById: actorId,
        completedAt: new Date(),
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "StockTransferRequest",
        entityId: transferId,
        oldValue: { status: "REQUESTED" },
        newValue: { status: "COMPLETED", approvedById: actorId },
        metadata: {
          transferNumber: transfer.transferNumber,
          from: transfer.fromWarehouse.name,
          to: transfer.toWarehouse.name,
          product: transfer.product.name,
          quantity: transferQty,
        },
        req,
      },
      tx
    );

    return completedTransfer;
  });
}

/**
 * Reject a stock transfer request
 */
async function rejectTransferRequest(companyId, transferId, reason, actorId, req = null) {
  const transfer = await prisma.stockTransferRequest.findFirst({
    where: { id: transferId, companyId },
  });

  if (!transfer) {
    const error = new Error("Stock transfer request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (transfer.status !== "REQUESTED") {
    const error = new Error(`Cannot reject a transfer with status '${transfer.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const rejected = await prisma.stockTransferRequest.update({
    where: { id: transferId },
    data: {
      status: "REJECTED",
      rejectionReason: reason || "Transfer request rejected by manager.",
      approvedById: actorId,
    },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      product: true,
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "StockTransferRequest",
      entityId: transferId,
      oldValue: { status: "REQUESTED" },
      newValue: { status: "REJECTED", rejectionReason: reason },
      req,
    },
    prisma
  );

  return rejected;
}

module.exports = {
  getWarehouses,
  getWarehouseById,
  getWarehouseManagers,
  createWarehouse,
  createMultiZoneWarehouses,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock,
  addOrAdjustStock,
  checkWarehouseStockForPickList,
  createTransferRequest,
  listTransferRequests,
  approveAndCompleteTransfer,
  rejectTransferRequest,
};

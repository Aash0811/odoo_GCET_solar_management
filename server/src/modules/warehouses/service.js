const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");

/**
 * List all warehouses for the company, with stock summary
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
      _count: {
        select: {
          stocks: true,
          pickLists: true,
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
 * Get warehouse detail by ID with stock inventory
 */
async function getWarehouseById(companyId, id) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, companyId },
    include: {
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
 * Create a new warehouse
 * Uniquely identifies the warehouse according to city and zone!
 */
async function createWarehouse(companyId, data, actorId, req = null) {
  const { name, code, city, zone, address, contactPerson, phone } = data;

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
        isActive: true,
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
        newValue: { name: warehouse.name, code: warehouse.code, city: warehouse.city, zone: warehouse.zone },
        req,
      },
      tx
    );

    return warehouse;
  });
}

/**
 * Update an existing warehouse
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

  const { name, code, city, zone, address, contactPerson, phone, isActive } = data;

  // If city or zone changed, check uniqueness
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

module.exports = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  getWarehouseStock,
  addOrAdjustStock,
  checkWarehouseStockForPickList,
};

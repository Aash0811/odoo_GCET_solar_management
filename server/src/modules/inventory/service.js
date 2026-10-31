const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");

function sanitizeProduct(product, userRole) {
  if (!product) return product;
  const isPrivileged = userRole === "ADMIN" || userRole === "DIRECTOR";
  if (!isPrivileged) {
    const { costPrice, ...rest } = product;
    return rest;
  }
  return product;
}

function sanitizePackageTemplate(template, userRole) {
  if (!template) return template;
  const isPrivileged = userRole === "ADMIN" || userRole === "DIRECTOR";
  if (!isPrivileged) {
    if (template.bomLines && Array.isArray(template.bomLines)) {
      return {
        ...template,
        bomLines: template.bomLines.map((line) => ({
          ...line,
          product: line.product ? sanitizeProduct(line.product, userRole) : line.product,
        })),
      };
    }
  }
  return template;
}

function validateCapacityBounds(minCapacityKw, maxCapacityKw, defaultCapacityKw) {
  const min = Number(minCapacityKw);
  const max = Number(maxCapacityKw);
  const defaultKw = Number(defaultCapacityKw);

  if (![min, max, defaultKw].every(Number.isFinite) || min <= 0 || max <= 0) {
    const error = new Error("Capacity limits must be positive numbers.");
    error.statusCode = 400;
    throw error;
  }
  if (min > max) {
    const error = new Error("Minimum capacity cannot exceed maximum capacity.");
    error.statusCode = 400;
    throw error;
  }
  if (defaultKw < min || defaultKw > max) {
    const error = new Error("Default capacity must be within the configured minimum and maximum.");
    error.statusCode = 400;
    throw error;
  }
}

async function getProducts(companyId, filters = {}, userRole = "ADMIN") {
  const { category, productType, isSerialTracked, lowStock, search, q, page, limit } = filters;
  const where = { companyId, isActive: true };

  if (category) where.category = category;
  if (productType) where.productType = productType;
  if (isSerialTracked !== undefined) where.isSerialTracked = isSerialTracked === "true";

  const searchQuery = (search || q || "").trim();
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      { category: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const hasPagination = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * pageSize;

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      ...(hasPagination ? { skip, take: pageSize } : {}),
      orderBy: { name: "asc" },
    }),
  ]);

  const filtered = lowStock === "true"
    ? products.filter((p) => Number(p.stockQty) <= Number(p.reorderLevel))
    : products;

  const sanitized = filtered.map((p) => sanitizeProduct(p, userRole));
  sanitized.pagination = {
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return sanitized;
}

async function getProductById(companyId, id, userRole = "ADMIN") {
  const product = await prisma.product.findFirst({
    where: { id, companyId },
  });

  if (!product) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
  }

  return sanitizeProduct(product, userRole);
}

async function getPackageTemplates(companyId, userRole = "ADMIN") {
  const templates = await prisma.packageTemplate.findMany({
    where: { companyId, isActive: true },
    include: {
      bomLines: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return templates.map((t) => sanitizePackageTemplate(t, userRole));
}

async function getPackageTemplateById(companyId, id, userRole = "ADMIN") {
  const template = await prisma.packageTemplate.findFirst({
    where: { id, companyId },
    include: {
      bomLines: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!template) {
    const error = new Error("Package template not found.");
    error.statusCode = 404;
    throw error;
  }

  return sanitizePackageTemplate(template, userRole);
}

async function updateProduct(companyId, id, data, actorId = null, req = null) {
  const product = await prisma.product.findFirst({
    where: { id, companyId },
  });

  if (!product) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.category !== undefined) updateData.category = data.category.trim();
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.isSerialTracked !== undefined) updateData.isSerialTracked = Boolean(data.isSerialTracked);
  if (data.warrantyYears !== undefined) updateData.warrantyYears = Number(data.warrantyYears);
  if (data.laborHours !== undefined) updateData.laborHours = data.laborHours !== null ? Number(data.laborHours) : null;
  if (data.isSubsidyEligible !== undefined) updateData.isSubsidyEligible = Boolean(data.isSubsidyEligible);
  if (data.costPrice !== undefined) updateData.costPrice = Number(data.costPrice);
  if (data.salePrice !== undefined) updateData.salePrice = Number(data.salePrice);
  if (data.stockQty !== undefined) updateData.stockQty = Number(data.stockQty);
  if (data.reorderLevel !== undefined) updateData.reorderLevel = Number(data.reorderLevel);
  if (data.gstRate !== undefined) updateData.gstRate = Number(data.gstRate);
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  if (actorId) {
    await recordAuditLog({
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "Product",
      entityId: id,
      metadata: updateData,
      req,
    });
  }

  return updated;
}

async function createProduct(companyId, data, actorId = null, req = null) {
  const {
    sku,
    name,
    category,
    productType = "HARDWARE",
    costPrice,
    salePrice,
    warrantyYears = 0,
    isSerialTracked = false,
    laborHours = null,
    isSubsidyEligible = true,
    gstRate = 18,
    unit = "unit",
    stockQty = 0,
    reorderLevel = 0,
    description,
  } = data;

  if (!sku || !name || !category || costPrice === undefined || salePrice === undefined) {
    const error = new Error("SKU, Name, Category, Cost Price, and Sale Price are required.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.product.findFirst({
    where: { companyId, sku: sku.trim().toUpperCase() },
  });
  if (existing) {
    const error = new Error(`A product with SKU "${sku}" already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const product = await prisma.product.create({
    data: {
      companyId,
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim(),
      productType: productType || "HARDWARE",
      description: description ? description.trim() : null,
      costPrice: Number(costPrice),
      salePrice: Number(salePrice),
      warrantyYears: Number(warrantyYears),
      isSerialTracked: Boolean(isSerialTracked),
      laborHours: laborHours !== null && laborHours !== undefined ? Number(laborHours) : null,
      isSubsidyEligible: Boolean(isSubsidyEligible),
      gstRate: Number(gstRate),
      unit: unit || "unit",
      stockQty: Number(stockQty),
      reorderLevel: Number(reorderLevel),
    },
  });

  if (actorId) {
    await recordAuditLog({
      companyId,
      actorId,
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      metadata: { sku: product.sku, name: product.name, salePrice: product.salePrice },
      req,
    });
  }

  return product;
}

async function createPackageTemplate(companyId, data, actorId = null, req = null) {
  const { name, description, type, minCapacityKw, maxCapacityKw, defaultCapacityKw, basePrice, bomLines = [] } = data;
  if (!name || !type) {
    const error = new Error("Package name and package type are required.");
    error.statusCode = 400;
    throw error;
  }
  validateCapacityBounds(minCapacityKw, maxCapacityKw, defaultCapacityKw);

  const template = await prisma.$transaction(async (tx) => {
    const pkg = await tx.packageTemplate.create({
      data: {
        companyId,
        name: name.trim(),
        description: description ? description.trim() : null,
        type,
        minCapacityKw: Number(minCapacityKw),
        maxCapacityKw: Number(maxCapacityKw),
        defaultCapacityKw: Number(defaultCapacityKw),
        basePrice: basePrice !== undefined ? Number(basePrice) : null,
        isActive: true,
      },
    });

    if (Array.isArray(bomLines) && bomLines.length > 0) {
      for (const line of bomLines) {
        if (line.productId) {
          await tx.bomLine.create({
            data: {
              packageTemplateId: pkg.id,
              productId: line.productId,
              quantityPerKw: Number(line.quantityPerKw || 0),
              fixedQuantity: Number(line.fixedQuantity || 0),
              notes: line.notes || null,
            },
          });
        }
      }
    }

    return await tx.packageTemplate.findUnique({
      where: { id: pkg.id },
      include: {
        bomLines: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  if (actorId) {
    await recordAuditLog({
      companyId,
      actorId,
      action: "CREATE",
      entityType: "PackageTemplate",
      entityId: template.id,
      metadata: { name: template.name, type: template.type, basePrice: template.basePrice },
      req,
    });
  }

  return template;
}

async function updatePackageTemplate(companyId, id, data, actorId = null, req = null) {
  const existing = await prisma.packageTemplate.findFirst({
    where: { id, companyId },
  });

  if (!existing) {
    const error = new Error("Package template not found.");
    error.statusCode = 404;
    throw error;
  }

  const { name, description, type, minCapacityKw, maxCapacityKw, defaultCapacityKw, basePrice, isActive, bomLines } = data;
  validateCapacityBounds(
    minCapacityKw ?? existing.minCapacityKw,
    maxCapacityKw ?? existing.maxCapacityKw,
    defaultCapacityKw ?? existing.defaultCapacityKw
  );

  const updateFields = {};
  if (name !== undefined) updateFields.name = name.trim();
  if (description !== undefined) updateFields.description = description ? description.trim() : null;
  if (type !== undefined) updateFields.type = type;
  if (minCapacityKw !== undefined) updateFields.minCapacityKw = Number(minCapacityKw);
  if (maxCapacityKw !== undefined) updateFields.maxCapacityKw = Number(maxCapacityKw);
  if (defaultCapacityKw !== undefined) updateFields.defaultCapacityKw = Number(defaultCapacityKw);
  if (basePrice !== undefined) updateFields.basePrice = Number(basePrice);
  if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.packageTemplate.update({
      where: { id },
      data: updateFields,
    });

    if (Array.isArray(bomLines)) {
      await tx.bomLine.deleteMany({
        where: { packageTemplateId: id },
      });

      for (const line of bomLines) {
        if (line.productId) {
          await tx.bomLine.create({
            data: {
              packageTemplateId: id,
              productId: line.productId,
              quantityPerKw: Number(line.quantityPerKw || 0),
              fixedQuantity: Number(line.fixedQuantity || 0),
              notes: line.notes || null,
            },
          });
        }
      }
    }

    return await tx.packageTemplate.findUnique({
      where: { id },
      include: {
        bomLines: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  if (actorId) {
    await recordAuditLog({
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "PackageTemplate",
      entityId: id,
      metadata: updateFields,
      req,
    });
  }

  return updated;
}

/**
 * Dynamic System Capacity: Get aggregated and per-package min/max kW supply limits
 */
async function getCapacitySettings(companyId) {
  const templates = await prisma.packageTemplate.findMany({
    where: { companyId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      minCapacityKw: true,
      maxCapacityKw: true,
      defaultCapacityKw: true,
      basePrice: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const types = ["ON_GRID", "OFF_GRID", "PANEL_SET", "INSTALLATION"];
  const byType = {};

  for (const t of types) {
    const matching = templates.filter((pkg) => pkg.type === t);
    if (matching.length > 0) {
      const minKw = Math.min(...matching.map((p) => Number(p.minCapacityKw)));
      const maxKw = Math.max(...matching.map((p) => Number(p.maxCapacityKw)));
      const defaultKw = Number(matching[0].defaultCapacityKw);
      byType[t] = {
        type: t,
        minKw,
        maxKw,
        defaultKw,
        packageCount: matching.length,
        packages: matching,
      };
    } else {
      byType[t] = {
        type: t,
        minKw: null,
        maxKw: null,
        defaultKw: null,
        packageCount: 0,
        packages: [],
      };
    }
  }

  const overallMin = templates.length > 0 ? Math.min(...templates.map((p) => Number(p.minCapacityKw))) : null;
  const overallMax = templates.length > 0 ? Math.max(...templates.map((p) => Number(p.maxCapacityKw))) : null;

  return {
    overallMinKw: overallMin,
    overallMaxKw: overallMax,
    byType,
    packages: templates,
  };
}

/**
 * Dynamic System Capacity: Admin update of min/max kW supply limits by type and per package
 */
async function updateCapacitySettings(companyId, data, actorId = null, req = null) {
  const { typeLimits, packageLimits } = data;
  const updatedResults = [];

  // 1. Update by package type (e.g. all ON_GRID or all OFF_GRID packages)
  if (Array.isArray(typeLimits)) {
    for (const tl of typeLimits) {
      if (tl.type) {
        const updateData = {};
        if (tl.minCapacityKw !== undefined) updateData.minCapacityKw = Number(tl.minCapacityKw);
        if (tl.maxCapacityKw !== undefined) updateData.maxCapacityKw = Number(tl.maxCapacityKw);
        if (tl.defaultCapacityKw !== undefined) updateData.defaultCapacityKw = Number(tl.defaultCapacityKw);

        if (Object.keys(updateData).length > 0) {
          const current = await prisma.packageTemplate.findFirst({
            where: { companyId, type: tl.type, isActive: true },
            select: { minCapacityKw: true, maxCapacityKw: true, defaultCapacityKw: true },
          });
          if (!current) {
            const error = new Error(`No active package exists for type '${tl.type}'.`);
            error.statusCode = 400;
            throw error;
          }
          validateCapacityBounds(
            updateData.minCapacityKw ?? current.minCapacityKw,
            updateData.maxCapacityKw ?? current.maxCapacityKw,
            updateData.defaultCapacityKw ?? current.defaultCapacityKw
          );
          const res = await prisma.packageTemplate.updateMany({
            where: { companyId, type: tl.type, isActive: true },
            data: updateData,
          });
          updatedResults.push({ type: tl.type, count: res.count, updateData });
        }
      }
    }
  }

  // 2. Update specific packages
  if (Array.isArray(packageLimits)) {
    for (const pl of packageLimits) {
      if (pl.id) {
        const updateData = {};
        if (pl.minCapacityKw !== undefined) updateData.minCapacityKw = Number(pl.minCapacityKw);
        if (pl.maxCapacityKw !== undefined) updateData.maxCapacityKw = Number(pl.maxCapacityKw);
        if (pl.defaultCapacityKw !== undefined) updateData.defaultCapacityKw = Number(pl.defaultCapacityKw);

        if (Object.keys(updateData).length > 0) {
          const current = await prisma.packageTemplate.findFirst({
            where: { id: pl.id, companyId },
            select: { minCapacityKw: true, maxCapacityKw: true, defaultCapacityKw: true },
          });
          if (!current) {
            const error = new Error("Package template not found.");
            error.statusCode = 404;
            throw error;
          }
          validateCapacityBounds(
            updateData.minCapacityKw ?? current.minCapacityKw,
            updateData.maxCapacityKw ?? current.maxCapacityKw,
            updateData.defaultCapacityKw ?? current.defaultCapacityKw
          );
          const pkg = await prisma.packageTemplate.update({
            where: { id: pl.id },
            data: updateData,
          });
          updatedResults.push({ packageId: pl.id, name: pkg.name, updateData });
        }
      }
    }
  }

  if (actorId) {
    await recordAuditLog({
      companyId,
      actorId,
      action: "UPDATE",
      entityType: "SystemCapacityLimits",
      entityId: companyId,
      metadata: { typeLimits, packageLimits, updatedResults },
      req,
    });
  }

  return await getCapacitySettings(companyId);
}

module.exports = {
  getProducts,
  getProductById,
  updateProduct,
  createProduct,
  getPackageTemplates,
  getPackageTemplateById,
  createPackageTemplate,
  updatePackageTemplate,
  getCapacitySettings,
  updateCapacitySettings,
};

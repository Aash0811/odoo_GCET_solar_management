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

async function getProducts(companyId, filters = {}, userRole = "ADMIN") {
  const { category, productType, isSerialTracked, lowStock } = filters;
  const where = { companyId, isActive: true };

  if (category) where.category = category;
  if (productType) where.productType = productType;
  if (isSerialTracked !== undefined) where.isSerialTracked = isSerialTracked === "true";

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const filtered = lowStock === "true"
    ? products.filter((p) => Number(p.stockQty) <= Number(p.reorderLevel))
    : products;

  return filtered.map((p) => sanitizeProduct(p, userRole));
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
  const { name, description, type, minCapacityKw = 1, maxCapacityKw = 10, defaultCapacityKw = 3, basePrice, bomLines = [] } = data;
  if (!name || !type) {
    const error = new Error("Package name and package type are required.");
    error.statusCode = 400;
    throw error;
  }

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

module.exports = {
  getProducts,
  getProductById,
  updateProduct,
  createProduct,
  getPackageTemplates,
  getPackageTemplateById,
  createPackageTemplate,
  updatePackageTemplate,
};

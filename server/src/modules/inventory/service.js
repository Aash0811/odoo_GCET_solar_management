const prisma = require("../../config/prisma");

async function getProducts(companyId, filters = {}) {
  const { category, isSerialTracked, lowStock } = filters;
  const where = { companyId, isActive: true };

  if (category) where.category = category;
  if (isSerialTracked !== undefined) where.isSerialTracked = isSerialTracked === "true";

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });

  if (lowStock === "true") {
    return products.filter((p) => Number(p.stockQty) <= Number(p.reorderLevel));
  }

  return products;
}

async function getProductById(companyId, id) {
  const product = await prisma.product.findFirst({
    where: { id, companyId },
  });

  if (!product) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
  }

  return product;
}

async function getPackageTemplates(companyId) {
  return await prisma.packageTemplate.findMany({
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
}

async function getPackageTemplateById(companyId, id) {
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

  return template;
}

module.exports = {
  getProducts,
  getProductById,
  getPackageTemplates,
  getPackageTemplateById,
};

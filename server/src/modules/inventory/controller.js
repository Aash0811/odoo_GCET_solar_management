const inventoryService = require("./service");

async function listProducts(req, res, next) {
  try {
    const products = await inventoryService.getProducts(req.companyId, req.query, req.user?.role);
    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await inventoryService.getProductById(req.companyId, req.params.id, req.user?.role);
    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function listPackageTemplates(req, res, next) {
  try {
    const templates = await inventoryService.getPackageTemplates(req.companyId, req.user?.role);
    return res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
}

async function getPackageTemplate(req, res, next) {
  try {
    const template = await inventoryService.getPackageTemplateById(req.companyId, req.params.id, req.user?.role);
    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await inventoryService.updateProduct(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await inventoryService.createProduct(
      req.companyId,
      req.body,
      req.user.id,
      req
    );
    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function createPackageTemplate(req, res, next) {
  try {
    const template = await inventoryService.createPackageTemplate(
      req.companyId,
      req.body,
      req.user.id,
      req
    );
    return res.status(201).json({
      success: true,
      message: "Solar package configuration created successfully.",
      data: template,
    });
  } catch (error) {
    next(error);
  }
}

async function updatePackageTemplate(req, res, next) {
  try {
    const template = await inventoryService.updatePackageTemplate(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Solar package configuration updated successfully.",
      data: template,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  updateProduct,
  createProduct,
  listPackageTemplates,
  getPackageTemplate,
  createPackageTemplate,
  updatePackageTemplate,
};

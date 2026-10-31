const inventoryService = require("./service");

async function listProducts(req, res, next) {
  try {
    const products = await inventoryService.getProducts(req.companyId, req.query);
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
    const product = await inventoryService.getProductById(req.companyId, req.params.id);
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
    const templates = await inventoryService.getPackageTemplates(req.companyId);
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
    const template = await inventoryService.getPackageTemplateById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  listPackageTemplates,
  getPackageTemplate,
};

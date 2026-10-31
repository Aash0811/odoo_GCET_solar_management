const warehousesService = require("./service");

async function listWarehouses(req, res, next) {
  try {
    const warehouses = await warehousesService.getWarehouses(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
}

async function getWarehouse(req, res, next) {
  try {
    const warehouse = await warehousesService.getWarehouseById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
}

async function createWarehouse(req, res, next) {
  try {
    const warehouse = await warehousesService.createWarehouse(
      req.companyId,
      req.body,
      req.user.id,
      req
    );
    return res.status(201).json({
      success: true,
      message: `Warehouse '${warehouse.name}' uniquely identified for City '${warehouse.city}' and Zone '${warehouse.zone}' created successfully.`,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
}

async function updateWarehouse(req, res, next) {
  try {
    const warehouse = await warehousesService.updateWarehouse(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Warehouse updated successfully.",
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
}

async function getWarehouseStock(req, res, next) {
  try {
    const stock = await warehousesService.getWarehouseStock(
      req.companyId,
      req.params.id,
      req.query.search
    );
    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    next(error);
  }
}

async function addOrAdjustStock(req, res, next) {
  try {
    const result = await warehousesService.addOrAdjustStock(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: `Stock updated for ${result.productName} at ${result.warehouseName}. New quantity: ${result.newQuantity}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function checkPickStock(req, res, next) {
  try {
    const check = await warehousesService.checkWarehouseStockForPickList(
      req.companyId,
      req.params.id,
      req.params.pickListId
    );
    return res.status(200).json({
      success: true,
      data: check,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  getWarehouseStock,
  addOrAdjustStock,
  checkPickStock,
};


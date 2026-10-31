const dispatchService = require("./service");

async function listPickLists(req, res, next) {
  try {
    const pickLists = await dispatchService.getPickLists(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: pickLists,
    });
  } catch (error) {
    next(error);
  }
}

async function getPickList(req, res, next) {
  try {
    const pickList = await dispatchService.getPickListById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: pickList,
    });
  } catch (error) {
    next(error);
  }
}

async function scanSerial(req, res, next) {
  try {
    const serialRecord = await dispatchService.scanSerial(
      req.companyId,
      req.body,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: `Serial ${serialRecord.serial} successfully scanned and assigned to order.`,
      data: serialRecord,
    });
  } catch (error) {
    next(error);
  }
}

async function validateDelivery(req, res, next) {
  try {
    const result = await dispatchService.validateDelivery(
      req.companyId,
      req.params.orderId,
      req.body,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: `Delivery ${result.delivery.deliveryNumber} validated! ${result.warrantiesCreatedCount} active warranties generated.`,
      data: result,
    });
  } catch (error) {
    if (error.missing) {
      return res.status(400).json({
        success: false,
        message: error.message,
        missing: error.missing,
      });
    }
    next(error);
  }
}

module.exports = {
  listPickLists,
  getPickList,
  scanSerial,
  validateDelivery,
};

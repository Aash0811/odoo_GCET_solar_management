const ordersService = require("./service");

async function listOrders(req, res, next) {
  try {
    const orders = await ordersService.getOrders(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await ordersService.getOrderById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const order = await ordersService.createOrderFromQuote(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: `Sales Order ${order.orderNumber} created. Awaiting payment to confirm.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function recordPayment(req, res, next) {
  try {
    const result = await ordersService.recordPaymentAndConfirm(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: result.pickList
        ? `Payment recorded. Order confirmed! Pick list ${result.pickList.pickNumber} and Installation job ${result.installationJob.jobNumber} created.`
        : "Payment recorded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  recordPayment,
};

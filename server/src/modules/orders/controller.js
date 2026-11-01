const ordersService = require("./service");

async function listOrders(req, res, next) {
  try {
    const orders = await ordersService.getOrders(req.companyId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data: orders,
      pagination: orders.pagination || null,
    });
  } catch (error) {
    next(error);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await ordersService.getOrderById(req.companyId, req.params.id, req.user);
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
      message: `Sales Order ${order.orderNumber} created. Awaiting minimum advance payment (${order.minAdvancePercent}%) to confirm and release job.`,
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
      req,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: result.message || "Payment recorded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const payment = await ordersService.verifyPayment(
      req.companyId,
      req.params.id,
      req.params.paymentId,
      req.user.id,
      req.body,
      req
    );

    return res.status(200).json({
      success: true,
      message: `Payment ${payment.receiptNumber || payment.id} verified by Accountant.`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

async function sendReminder(req, res, next) {
  try {
    const result = await ordersService.sendPaymentReminder(
      req.companyId,
      req.params.id,
      req.user.id,
      req.body,
      req
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadPaymentReceipt(req, res, next) {
  try {
    const buffer = await ordersService.getPaymentReceiptPdfBuffer(
      req.companyId,
      req.params.id,
      req.params.paymentId,
      req.user
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${req.params.paymentId}.pdf`
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  recordPayment,
  verifyPayment,
  sendReminder,
  downloadPaymentReceipt,
};

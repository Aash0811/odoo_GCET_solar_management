const express = require("express");
const router = express.Router();
const ordersController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const {
  createOrderSchema,
  recordPaymentSchema,
  verifyPaymentSchema,
  sendReminderSchema,
} = require("./schema");

router.use(authenticate);
router.use(companyScope);

// Order Status & Detail Views (Sales sees status, Customer sees payment history)
router.get(
  "/",
  requireRole("ADMIN", "SALESMAN", "ACCOUNTANT", "WAREHOUSE", "SUPPORT", "CUSTOMER"),
  ordersController.listOrders
);

router.get(
  "/:id",
  requireRole("ADMIN", "SALESMAN", "ACCOUNTANT", "WAREHOUSE", "SUPPORT", "CUSTOMER"),
  ordersController.getOrder
);

// Payment Receipts
router.get(
  "/:id/payments/:paymentId/receipt",
  requireRole("ADMIN", "SALESMAN", "ACCOUNTANT", "CUSTOMER"),
  ordersController.downloadPaymentReceipt
);

// Order Creation
router.post(
  "/",
  requireRole("ADMIN", "SALESMAN"),
  validate(createOrderSchema),
  ordersController.createOrder
);

// Payment Recording (Admin, Accountant, Salesman, Customer)
router.post(
  "/:id/payments",
  requireRole("ADMIN", "ACCOUNTANT", "SALESMAN", "CUSTOMER"),
  validate(recordPaymentSchema),
  ordersController.recordPayment
);

router.patch(
  "/:id/payments/:paymentId/verify",
  requireRole("ADMIN", "ACCOUNTANT"),
  validate(verifyPaymentSchema),
  ordersController.verifyPayment
);

// Payment Reminders (Accountant / Salesman)
router.post(
  "/:id/reminders",
  requireRole("ADMIN", "ACCOUNTANT", "SALESMAN"),
  validate(sendReminderSchema),
  ordersController.sendReminder
);

module.exports = router;

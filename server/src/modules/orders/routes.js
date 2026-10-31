const express = require("express");
const router = express.Router();
const ordersController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { createOrderSchema, recordPaymentSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/", requireRole("ADMIN", "SALESMAN", "WAREHOUSE", "SUPPORT", "CUSTOMER"), ordersController.listOrders);
router.get("/:id", requireRole("ADMIN", "SALESMAN", "WAREHOUSE", "SUPPORT", "CUSTOMER"), ordersController.getOrder);

router.post("/", requireRole("ADMIN", "SALESMAN"), validate(createOrderSchema), ordersController.createOrder);
router.post("/:id/payments", requireRole("ADMIN", "SALESMAN"), validate(recordPaymentSchema), ordersController.recordPayment);

module.exports = router;

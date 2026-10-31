const express = require("express");
const router = express.Router();
const dispatchController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { scanSerialSchema, validateDeliverySchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/pick-lists", requireRole("ADMIN", "WAREHOUSE", "SALESMAN"), dispatchController.listPickLists);
router.get("/pick-lists/:id", requireRole("ADMIN", "WAREHOUSE", "SALESMAN"), dispatchController.getPickList);
router.patch("/pick-lists/:id/warehouse", requireRole("ADMIN", "WAREHOUSE"), dispatchController.assignWarehouse);
router.post("/pick-lists/:id/pick-item", requireRole("ADMIN", "WAREHOUSE"), dispatchController.pickItem);

router.post("/scan-serial", requireRole("ADMIN", "WAREHOUSE"), validate(scanSerialSchema), dispatchController.scanSerial);
router.post("/orders/:orderId/validate-delivery", requireRole("ADMIN", "WAREHOUSE"), validate(validateDeliverySchema), dispatchController.validateDelivery);

module.exports = router;

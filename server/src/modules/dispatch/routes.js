const express = require("express");
const router = express.Router();
const dispatchController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { scanSerialSchema, validateDeliverySchema, updateDeliveryStatusSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/pick-lists", requireRole("ADMIN", "WAREHOUSE", "DELIVERY_AGENT", "SALESMAN"), dispatchController.listPickLists);
router.get("/lookup-barcode", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN", "SALESMAN", "SUPPORT"), dispatchController.lookupBarcode);
router.get("/lookup-barcode/:code", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN", "SALESMAN", "SUPPORT"), dispatchController.lookupBarcode);
router.get("/barcode/:code", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN", "SALESMAN", "SUPPORT"), dispatchController.lookupBarcode);
router.get("/item-barcodes", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN", "SALESMAN", "SUPPORT"), dispatchController.getItemBarcodes);
router.post("/seed-unique-codes", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN"), dispatchController.seedUniqueCodes);
router.post("/register-serial", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN"), dispatchController.registerSerial);
router.get("/pick-lists/:id", requireRole("ADMIN", "WAREHOUSE", "DELIVERY_AGENT", "SALESMAN"), dispatchController.getPickList);
router.patch("/pick-lists/:id/delivery-agent", requireRole("ADMIN", "WAREHOUSE"), dispatchController.assignDeliveryAgent);
router.patch("/pick-lists/:id/warehouse", requireRole("ADMIN", "WAREHOUSE"), dispatchController.assignWarehouse);
router.post("/pick-lists/:id/pick-item", requireRole("ADMIN", "WAREHOUSE"), dispatchController.pickItem);

router.post("/scan-serial", requireRole("ADMIN", "WAREHOUSE", "TECHNICIAN"), validate(scanSerialSchema), dispatchController.scanSerial);
router.post("/orders/:orderId/validate-delivery", requireRole("ADMIN", "WAREHOUSE", "DELIVERY_AGENT"), validate(validateDeliverySchema), dispatchController.validateDelivery);
router.patch("/orders/:orderId/delivery-status", requireRole("ADMIN", "DELIVERY_AGENT"), validate(updateDeliveryStatusSchema), dispatchController.updateDeliveryStatus);

module.exports = router;

const express = require("express");
const router = express.Router();
const inventoryController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");

router.use(authenticate);
router.use(companyScope);

router.get("/products", inventoryController.listProducts);
router.get("/products/:id", inventoryController.getProduct);
router.get("/templates", inventoryController.listPackageTemplates);
router.get("/templates/:id", inventoryController.getPackageTemplate);

module.exports = router;

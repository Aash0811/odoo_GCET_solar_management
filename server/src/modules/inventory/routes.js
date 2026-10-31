const express = require("express");
const router = express.Router();
const inventoryController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");

router.use(authenticate);
router.use(companyScope);

router.get("/products", inventoryController.listProducts);
router.post("/products", inventoryController.createProduct);
router.get("/products/:id", inventoryController.getProduct);
router.patch("/products/:id", inventoryController.updateProduct);

router.get("/templates", inventoryController.listPackageTemplates);
router.post("/templates", inventoryController.createPackageTemplate);
router.get("/templates/:id", inventoryController.getPackageTemplate);
router.patch("/templates/:id", inventoryController.updatePackageTemplate);

module.exports = router;

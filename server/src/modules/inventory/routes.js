const express = require("express");
const router = express.Router();
const inventoryController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { createProductSchema, updateProductSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

// Products Catalog (Master Data)
// Read: Everyone authenticated (costPrice masked for non-Admin)
// Write: Admin & Manager only
router.get("/products", inventoryController.listProducts);
router.get("/products/:id", inventoryController.getProduct);
router.post("/products", requireRole("ADMIN"), validate(createProductSchema), inventoryController.createProduct);
router.patch("/products/:id", requireRole("ADMIN"), validate(updateProductSchema), inventoryController.updateProduct);

// Package Templates & Dynamic BOM
// Read: Everyone authenticated
// Write: Admin & Salesman (Custom packages)
router.get("/templates", inventoryController.listPackageTemplates);
router.get("/templates/:id", inventoryController.getPackageTemplate);
router.post("/templates", requireRole("ADMIN", "SALESMAN"), inventoryController.createPackageTemplate);
router.patch("/templates/:id", requireRole("ADMIN", "SALESMAN"), inventoryController.updatePackageTemplate);

module.exports = router;

const express = require("express");
const router = express.Router();
const warehousesController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");

router.use(authenticate);
router.use(companyScope);

// Warehouses list & detail (accessible to ADMIN, WAREHOUSE, SALESMAN, TECHNICIAN)
router.get("/", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.listWarehouses);
router.get("/:id", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.getWarehouse);

// Create & update warehouse (ADMIN and WAREHOUSE managers)
router.post("/", requireRole("ADMIN", "WAREHOUSE"), warehousesController.createWarehouse);
router.patch("/:id", requireRole("ADMIN", "WAREHOUSE"), warehousesController.updateWarehouse);

// Stock in warehouse (view, add, adjust)
router.get("/:id/stock", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.getWarehouseStock);
router.post("/:id/stock", requireRole("ADMIN", "WAREHOUSE"), warehousesController.addOrAdjustStock);

// Check stock in warehouse for a specific pick list
router.get("/:id/check-pick/:pickListId", requireRole("ADMIN", "WAREHOUSE"), warehousesController.checkPickStock);

module.exports = router;


const express = require("express");
const router = express.Router();
const warehousesController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");

router.use(authenticate);
router.use(companyScope);

// Warehouse managers list (Strictly ADMIN only for manager assignment)
router.get("/managers", requireRole("ADMIN"), warehousesController.getWarehouseManagers);

// Inter-warehouse stock transfers
router.get("/transfers", requireRole("ADMIN", "WAREHOUSE"), warehousesController.listTransferRequests);
router.post("/transfers", requireRole("ADMIN", "WAREHOUSE"), warehousesController.createTransferRequest);
router.post("/transfers/:id/approve", requireRole("ADMIN", "WAREHOUSE"), warehousesController.approveTransferRequest);
router.post("/transfers/:id/reject", requireRole("ADMIN", "WAREHOUSE"), warehousesController.rejectTransferRequest);

// Warehouses list & detail (accessible to ADMIN, WAREHOUSE, SALESMAN, TECHNICIAN)
router.get("/", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.listWarehouses);
router.get("/:id", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.getWarehouse);

// Multi-Zone City creation & variants (Strictly ADMIN only)
router.post("/batch", requireRole("ADMIN"), warehousesController.createMultiZoneWarehouses);
router.post("/city-zones", requireRole("ADMIN"), warehousesController.createMultiZoneWarehouses);

// Create & update warehouse (Strictly ADMIN only)
router.post("/", requireRole("ADMIN"), warehousesController.createWarehouse);
router.patch("/:id", requireRole("ADMIN"), warehousesController.updateWarehouse);

// Delete warehouse (Strictly ADMIN only)
router.delete("/:id", requireRole("ADMIN"), warehousesController.deleteWarehouse);

// Stock in warehouse (view, add, adjust)
router.get("/:id/stock", requireRole("ADMIN", "WAREHOUSE", "SALESMAN", "TECHNICIAN"), warehousesController.getWarehouseStock);
router.post("/:id/stock", requireRole("ADMIN", "WAREHOUSE"), warehousesController.addOrAdjustStock);

// Check stock in warehouse for a specific pick list
router.get("/:id/check-pick/:pickListId", requireRole("ADMIN", "WAREHOUSE"), warehousesController.checkPickStock);

module.exports = router;

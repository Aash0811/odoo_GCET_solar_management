const express = require("express");
const router = express.Router();
const dashboardController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { createShareLinkSchema } = require("./schema");

// Public endpoint for shared dashboard link access
router.get("/shared/:token", dashboardController.getSharedDashboard);
router.get("/shared", dashboardController.getSharedDashboard);

// Protected endpoints
router.use(authenticate);
router.use(companyScope);

router.get("/stats", requireRole("ADMIN", "ACCOUNTANT", "SALESMAN"), dashboardController.getStats);
router.get("/export-csv", requireRole("ADMIN", "ACCOUNTANT"), dashboardController.exportCsv);
router.post("/share-link", requireRole("ADMIN", "ACCOUNTANT"), validate(createShareLinkSchema), dashboardController.createShareLink);

module.exports = router;

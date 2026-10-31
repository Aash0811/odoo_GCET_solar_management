const express = require("express");
const router = express.Router();
const financeController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { createCostEntrySchema, updateSubsidySchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/costing", requireRole("ADMIN", "SALESMAN"), financeController.getJobCosting);
router.get("/subsidies", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), financeController.getSubsidyTracker);
router.patch("/subsidies/:id", requireRole("ADMIN", "SALESMAN"), validate(updateSubsidySchema), financeController.updateSubsidy);

router.get("/payouts", requireRole("ADMIN", "TECHNICIAN"), financeController.getTechnicianPayoutSummary);
router.post("/cost-entries", requireRole("ADMIN", "SALESMAN"), validate(createCostEntrySchema), financeController.addCostEntry);

router.get("/invoices", requireRole("ADMIN", "SUPPORT", "SALESMAN", "CUSTOMER"), financeController.listInvoices);
router.get("/invoices/:id/pdf", requireRole("ADMIN", "SUPPORT", "SALESMAN", "CUSTOMER"), financeController.downloadInvoicePdf);

module.exports = router;

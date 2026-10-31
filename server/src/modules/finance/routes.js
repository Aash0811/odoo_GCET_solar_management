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

router.get("/costing", requireRole("ADMIN", "ACCOUNTANT", "SALESMAN"), financeController.getJobCosting);
router.get("/subsidies", requireRole("ADMIN", "ACCOUNTANT", "SALESMAN", "SUPPORT", "CUSTOMER"), financeController.getSubsidyTracker);
router.patch("/subsidies/:id", requireRole("ADMIN", "ACCOUNTANT", "SALESMAN"), validate(updateSubsidySchema), financeController.updateSubsidy);

router.get("/payouts", requireRole("ADMIN", "ACCOUNTANT", "TECHNICIAN"), financeController.getTechnicianPayoutSummary);
router.post("/cost-entries", requireRole("ADMIN", "ACCOUNTANT", "SALESMAN"), validate(createCostEntrySchema), financeController.addCostEntry);

router.get("/invoices", requireRole("ADMIN", "ACCOUNTANT", "SUPPORT", "SALESMAN", "CUSTOMER"), financeController.listInvoices);
router.get("/invoices/:id/pdf", requireRole("ADMIN", "ACCOUNTANT", "SUPPORT", "SALESMAN", "CUSTOMER"), financeController.downloadInvoicePdf);

module.exports = router;

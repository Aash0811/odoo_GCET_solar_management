const express = require("express");
const router = express.Router();
const quotesController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { createQuoteSchema, updateQuoteStatusSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.listQuotes);
router.get("/:id", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.getQuote);
router.get("/:id/pdf", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.downloadQuotePdf);

router.post("/", requireRole("ADMIN", "SALESMAN"), validate(createQuoteSchema), quotesController.createQuote);
router.patch("/:id/status", requireRole("ADMIN", "SALESMAN"), validate(updateQuoteStatusSchema), quotesController.updateQuoteStatus);

module.exports = router;

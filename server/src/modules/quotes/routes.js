const express = require("express");
const router = express.Router();
const quotesController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const {
  createQuoteSchema,
  updateQuoteLinesSchema,
  updateQuoteStatusSchema,
  approveDiscountSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
} = require("./schema");

// ─────────────────────────────────────────────────────────────
// Public Unauthenticated Share-Link Endpoints
// (Allows customer to view, review, and digitally accept/reject via secure share token)
// ─────────────────────────────────────────────────────────────
router.get("/shared/:token", quotesController.getSharedQuote);
router.post("/shared/:token/accept", quotesController.acceptSharedQuote);
router.post("/shared/:token/reject", quotesController.rejectSharedQuote);

// ─────────────────────────────────────────────────────────────
// Authenticated Company-Scoped Endpoints
// ─────────────────────────────────────────────────────────────
router.use(authenticate);
router.use(companyScope);

router.get("/", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.listQuotes);
router.get("/:id", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.getQuote);
router.get("/:id/pdf", requireRole("ADMIN", "SALESMAN", "SUPPORT", "CUSTOMER"), quotesController.downloadQuotePdf);

router.post("/", requireRole("ADMIN", "SALESMAN"), validate(createQuoteSchema), quotesController.createQuote);
router.patch("/:id/lines", requireRole("ADMIN", "SALESMAN"), validate(updateQuoteLinesSchema), quotesController.updateQuoteLines);
router.patch("/:id/approve-discount", requireRole("ADMIN"), validate(approveDiscountSchema), quotesController.approveDiscount);
router.post("/:id/accept", requireRole("ADMIN", "SALESMAN", "CUSTOMER"), validate(acceptQuoteSchema), quotesController.acceptQuote);
router.post("/:id/reject", requireRole("ADMIN", "SALESMAN", "CUSTOMER"), validate(rejectQuoteSchema), quotesController.rejectQuote);
router.patch("/:id/status", requireRole("ADMIN", "SALESMAN"), validate(updateQuoteStatusSchema), quotesController.updateQuoteStatus);

module.exports = router;

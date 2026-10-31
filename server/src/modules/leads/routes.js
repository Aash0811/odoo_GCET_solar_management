const express = require("express");
const router = express.Router();
const leadsController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const {
  createLeadSchema,
  updateStageSchema,
  updateChecklistSchema,
} = require("./schema");

// Public endpoint for online customer rooftop solar inquiry form
router.post(
  "/public",
  validate(createLeadSchema.partial({ title: true })),
  leadsController.createPublicLead
);

router.use(authenticate);
router.use(companyScope);

router.get(
  "/",
  requireRole("ADMIN", "SALESMAN", "SUPPORT", "TECHNICIAN"),
  leadsController.listLeads
);

router.get(
  "/:id",
  requireRole("ADMIN", "SALESMAN", "SUPPORT", "TECHNICIAN"),
  leadsController.getLead
);

router.post(
  "/",
  requireRole("ADMIN", "SALESMAN"),
  validate(createLeadSchema),
  leadsController.createLead
);

router.patch(
  "/:id/checklist",
  requireRole("ADMIN", "SALESMAN", "TECHNICIAN"),
  validate(updateChecklistSchema),
  leadsController.updateChecklist
);

router.patch(
  "/:id/stage",
  requireRole("ADMIN", "SALESMAN"),
  validate(updateStageSchema),
  leadsController.updateStage
);

router.delete(
  "/:id",
  requireRole("ADMIN", "SALESMAN"),
  leadsController.archiveLead
);

module.exports = router;

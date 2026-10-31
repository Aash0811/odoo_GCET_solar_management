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
  reassignSchema,
  activitySchema,
} = require("./schema");

// Public endpoint for online customer rooftop solar inquiry form & webhook
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
  "/sales-reps",
  requireRole("ADMIN", "SALESMAN"),
  leadsController.getSalesReps
);

router.get(
  "/kanban",
  requireRole("ADMIN", "SALESMAN", "SUPPORT", "TECHNICIAN"),
  leadsController.getKanban
);

router.post(
  "/customer-direct",
  requireRole("ADMIN", "SALESMAN"),
  leadsController.createCustomerDirect
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

router.post(
  "/:id/create-customer",
  requireRole("ADMIN", "SALESMAN"),
  leadsController.createCustomerAccount
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

router.patch(
  "/:id/assign",
  requireRole("ADMIN", "SALESMAN"),
  validate(reassignSchema),
  leadsController.reassignLead
);

router.post(
  "/:id/activity",
  requireRole("ADMIN", "SALESMAN", "SUPPORT"),
  validate(activitySchema),
  leadsController.logActivity
);

router.delete(
  "/:id",
  requireRole("ADMIN", "SALESMAN"),
  leadsController.archiveLead
);

module.exports = router;

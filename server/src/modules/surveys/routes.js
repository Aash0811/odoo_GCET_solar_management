const express = require("express");
const router = express.Router();
const surveysController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { upload } = require("../../middleware/upload");
const {
  scheduleSurveySchema,
  submitSurveySchema,
  reviewSurveySchema,
} = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get(
  "/",
  requireRole("ADMIN", "TECHNICIAN"),
  surveysController.listSurveys
);

router.get(
  "/technicians",
  requireRole("ADMIN", "TECHNICIAN"),
  surveysController.getTechnicians
);

router.get(
  "/:id",
  requireRole("ADMIN", "TECHNICIAN"),
  surveysController.getSurvey
);

router.post(
  "/schedule",
  requireRole("ADMIN"),
  validate(scheduleSurveySchema),
  surveysController.scheduleSurvey
);

// Technician mobile survey submission with up to 5 photos
router.post(
  "/:id/submit",
  requireRole("ADMIN", "TECHNICIAN"),
  upload.array("photos", 5),
  surveysController.submitSurvey
);

router.patch(
  "/:id/review",
  requireRole("ADMIN"),
  validate(reviewSurveySchema),
  surveysController.reviewSurvey
);

module.exports = router;

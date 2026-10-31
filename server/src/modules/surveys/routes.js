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
  requireRole("ADMIN", "SALESMAN", "TECHNICIAN"),
  surveysController.listSurveys
);

router.get(
  "/:id",
  requireRole("ADMIN", "SALESMAN", "TECHNICIAN"),
  surveysController.getSurvey
);

router.post(
  "/schedule",
  requireRole("ADMIN", "SALESMAN"),
  validate(scheduleSurveySchema),
  surveysController.scheduleSurvey
);

// Technician mobile survey submission with up to 5 photos
router.post(
  "/:id/submit",
  requireRole("ADMIN", "TECHNICIAN"),
  upload.array("photos", 5),
  // JSON fields in multipart/form-data will be in req.body
  surveysController.submitSurvey
);

router.patch(
  "/:id/review",
  requireRole("ADMIN", "SALESMAN"),
  validate(reviewSurveySchema),
  surveysController.reviewSurvey
);

module.exports = router;

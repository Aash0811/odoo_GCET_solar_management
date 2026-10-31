const express = require("express");
const router = express.Router();
const jobsController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { upload } = require("../../middleware/upload");
const { updateJobProgressSchema, completeJobSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/", requireRole("ADMIN", "TECHNICIAN", "SALESMAN", "SUPPORT", "CUSTOMER"), jobsController.listJobs);
router.get("/:id", requireRole("ADMIN", "TECHNICIAN", "SALESMAN", "SUPPORT", "CUSTOMER"), jobsController.getJob);
router.get("/:id/certificate", requireRole("ADMIN", "TECHNICIAN", "SALESMAN", "SUPPORT", "CUSTOMER"), jobsController.downloadCertificate);

router.patch("/:id/progress", requireRole("ADMIN", "TECHNICIAN"), validate(updateJobProgressSchema), jobsController.updateJobProgress);
router.post(
  "/:id/photos",
  requireRole("ADMIN", "TECHNICIAN"),
  upload.fields([
    { name: "photo", maxCount: 10 },
    { name: "photos", maxCount: 10 },
  ]),
  jobsController.uploadPhoto
);

// Complete job endpoint: handles both photo uploads, signature upload, and checklist body
router.post(
  "/:id/complete",
  requireRole("ADMIN", "TECHNICIAN"),
  upload.fields([
    { name: "photos", maxCount: 5 },
    { name: "signature", maxCount: 1 },
  ]),
  jobsController.completeJob
);

module.exports = router;

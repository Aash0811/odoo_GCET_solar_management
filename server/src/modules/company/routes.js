const express = require("express");
const router = express.Router();
const companyController = require("./controller");
const authenticate = require("../../middleware/auth");
const requireRole = require("../../middleware/requireRole");

// Publicly readable company profile (for landing page, customer quotes, inquiries)
router.get("/", companyController.getCompany);

// Updating company settings requires Admin authentication
router.patch(
  "/",
  authenticate,
  requireRole("ADMIN"),
  companyController.updateCompany
);

module.exports = router;


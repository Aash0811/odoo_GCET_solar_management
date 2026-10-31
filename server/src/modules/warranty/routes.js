const express = require("express");
const router = express.Router();
const warrantyController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const { voidWarrantySchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/search", requireRole("ADMIN", "SUPPORT", "SALESMAN", "TECHNICIAN", "CUSTOMER"), warrantyController.searchWarranties);
router.get("/expiring", requireRole("ADMIN", "SUPPORT", "SALESMAN"), warrantyController.getExpiringWarranties);
router.patch("/:id/void", requireRole("ADMIN"), validate(voidWarrantySchema), warrantyController.voidWarranty);

module.exports = router;

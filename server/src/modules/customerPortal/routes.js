const express = require("express");
const router = express.Router();
const customerPortalController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const validate = require("../../middleware/validate");
const { raiseTicketSchema, signAcceptanceSchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/me", customerPortalController.getMyPortal);
router.post("/tickets", validate(raiseTicketSchema), customerPortalController.raiseTicket);
router.post("/jobs/:jobId/sign", validate(signAcceptanceSchema), customerPortalController.signAcceptance);

module.exports = router;

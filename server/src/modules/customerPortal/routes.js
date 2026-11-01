const express = require("express");
const router = express.Router();
const customerPortalController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const validate = require("../../middleware/validate");
const { raiseTicketSchema, signAcceptanceSchema, acceptDeliverySchema } = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/me", customerPortalController.getMyPortal);
router.post("/tickets", validate(raiseTicketSchema), customerPortalController.raiseTicket);
router.post("/jobs/:jobId/sign", validate(signAcceptanceSchema), customerPortalController.signAcceptance);
router.post("/deliveries/:deliveryId/accept", validate(acceptDeliverySchema), customerPortalController.acceptDelivery);

module.exports = router;

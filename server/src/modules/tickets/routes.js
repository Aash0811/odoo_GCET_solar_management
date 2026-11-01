const express = require("express");
const router = express.Router();
const ticketsController = require("./controller");
const authenticate = require("../../middleware/auth");
const companyScope = require("../../middleware/companyScope");
const requireRole = require("../../middleware/requireRole");
const validate = require("../../middleware/validate");
const {
  createTicketSchema,
  addTicketLineSchema,
  resolveTicketSchema,
  updateTicketStatusSchema,
} = require("./schema");

router.use(authenticate);
router.use(companyScope);

router.get("/", requireRole("ADMIN", "SUPPORT", "SALESMAN", "TECHNICIAN", "CUSTOMER"), ticketsController.listTickets);
router.get("/:id", requireRole("ADMIN", "SUPPORT", "SALESMAN", "TECHNICIAN", "CUSTOMER"), ticketsController.getTicket);

router.post("/", requireRole("ADMIN", "SUPPORT", "SALESMAN", "CUSTOMER"), validate(createTicketSchema), ticketsController.createTicket);
router.post("/:id/lines", requireRole("ADMIN", "SUPPORT", "SALESMAN", "TECHNICIAN"), validate(addTicketLineSchema), ticketsController.addTicketLine);
router.post("/:id/resolve", requireRole("ADMIN", "SUPPORT", "TECHNICIAN"), validate(resolveTicketSchema), ticketsController.resolveTicket);
router.patch("/:id/status", requireRole("ADMIN", "SUPPORT", "SALESMAN", "CUSTOMER"), validate(updateTicketStatusSchema), ticketsController.updateTicketStatus);

module.exports = router;

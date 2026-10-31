const ticketsService = require("./service");

async function listTickets(req, res, next) {
  try {
    const tickets = await ticketsService.getTickets(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
}

async function getTicket(req, res, next) {
  try {
    const ticket = await ticketsService.getTicketById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function createTicket(req, res, next) {
  try {
    const ticket = await ticketsService.createTicket(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: `Service ticket ${ticket.ticketNumber} created.`,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function addTicketLine(req, res, next) {
  try {
    const line = await ticketsService.addTicketLine(req.companyId, req.params.id, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: line.isWarrantyCovered
        ? "Line added: COVERED UNDER WARRANTY (INR 0.00)"
        : `Line added: OUT OF WARRANTY (INR ${line.lineTotal})`,
      data: line,
    });
  } catch (error) {
    next(error);
  }
}

async function resolveTicket(req, res, next) {
  try {
    const result = await ticketsService.resolveTicket(req.companyId, req.params.id, req.body, req.user.id, req);
    let msg = `Ticket ${result.ticket.ticketNumber} marked as RESOLVED.`;
    if (result.invoice) {
      msg += ` Auto-generated invoice ${result.invoice.invoiceNumber} for INR ${result.invoice.totalAmount}.`;
    }
    if (result.swappedNewSerial) {
      msg += ` Replacement serial ${result.swappedNewSerial.serial} installed with new warranty.`;
    }

    return res.status(200).json({
      success: true,
      message: msg,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTicketStatus(req, res, next) {
  try {
    const updated = await ticketsService.updateTicketStatus(
      req.companyId,
      req.params.id,
      req.body.status,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${updated.status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTickets,
  getTicket,
  createTicket,
  addTicketLine,
  resolveTicket,
  updateTicketStatus,
};

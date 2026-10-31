const customerPortalService = require("./service");
const prisma = require("../../config/prisma");

async function getMyPortal(req, res, next) {
  try {
    let customerId = req.query.customerId;

    // If customer role logged in, find their associated Customer record
    if (req.user.role === "CUSTOMER" || !customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          companyId: req.companyId,
          OR: [
            { email: req.user.email },
            { phone: req.user.phone || "" },
          ],
        },
      });

      if (customer) {
        customerId = customer.id;
      } else {
        // Fallback to first customer for demo
        const firstCust = await prisma.customer.findFirst({
          where: { companyId: req.companyId },
        });
        customerId = firstCust?.id;
      }
    }

    if (!customerId) {
      return res.status(404).json({ success: false, message: "No customer account linked." });
    }

    const data = await customerPortalService.getCustomerPortalData(req.companyId, customerId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function raiseTicket(req, res, next) {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        companyId: req.companyId,
        OR: [
          { email: req.user.email },
          { phone: req.user.phone || "" },
        ],
      },
    });

    const customerId = customer ? customer.id : req.body.customerId;
    if (!customerId) {
      return res.status(400).json({ success: false, message: "customerId required." });
    }

    const ticket = await customerPortalService.customerRaiseTicket(
      req.companyId,
      customerId,
      req.body,
      req.user.id,
      req
    );

    return res.status(201).json({
      success: true,
      message: `Ticket ${ticket.ticketNumber} submitted successfully. Support team notified.`,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function signAcceptance(req, res, next) {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        companyId: req.companyId,
        OR: [
          { email: req.user.email },
          { phone: req.user.phone || "" },
        ],
      },
    });

    const customerId = customer ? customer.id : req.body.customerId;
    if (!customerId) {
      return res.status(400).json({ success: false, message: "customerId required." });
    }

    const signature = await customerPortalService.signJobAcceptance(
      req.companyId,
      customerId,
      req.params.jobId,
      req.body,
      req.user.id,
      req
    );

    return res.status(200).json({
      success: true,
      message: "Installation completion acceptance signed.",
      data: signature,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyPortal,
  raiseTicket,
  signAcceptance,
};

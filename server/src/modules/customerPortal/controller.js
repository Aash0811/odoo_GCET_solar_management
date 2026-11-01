const customerPortalService = require("./service");
const prisma = require("../../config/prisma");

async function findCustomerForUser(req) {
  const identityFilters = [];
  if (req.user.email) identityFilters.push({ email: req.user.email });
  if (req.user.phone) identityFilters.push({ phone: req.user.phone });

  if (identityFilters.length === 0) return null;

  return prisma.customer.findFirst({
    where: {
      companyId: req.companyId,
      OR: identityFilters,
    },
  });
}

async function getMyPortal(req, res, next) {
  try {
    let customerId = req.query.customerId;

    // If customer role logged in, find their associated Customer record
    if (req.user.role === "CUSTOMER" || !customerId) {
      const customer = await findCustomerForUser(req);

      if (customer) {
        customerId = customer.id;
      } else if (req.user.role !== "CUSTOMER") {
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
    const customer = await findCustomerForUser(req);

    const customerId = customer
      ? customer.id
      : req.user.role === "CUSTOMER"
        ? null
        : req.body.customerId;
    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found." });
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
    const customer = await findCustomerForUser(req);

    const customerId = customer
      ? customer.id
      : req.user.role === "CUSTOMER"
        ? null
        : req.body.customerId;
    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found." });
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

async function acceptDelivery(req, res, next) {
  try {
    const customer = await findCustomerForUser(req);
    if (!customer) return res.status(404).json({ success: false, message: "Customer profile not found." });
    const delivery = await customerPortalService.acceptDelivery(
      req.companyId,
      customer.id,
      req.params.deliveryId,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({ success: true, message: "Delivery accepted successfully.", data: delivery });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyPortal,
  raiseTicket,
  signAcceptance,
  acceptDelivery,
};

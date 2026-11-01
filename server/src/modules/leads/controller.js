const leadsService = require("./service");
const prisma = require("../../config/prisma");

async function createPublicLead(req, res, next) {
  try {
    const company = await prisma.company.findFirst({ where: { isActive: true } });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }
    const leadData = {
      ...req.body,
      title: req.body.title || `${req.body.desiredCapacityKw || 3} kW Rooftop Inquiry - ${req.body.contactName}`,
      source: req.body.source || "WEB_FORM",
    };
    const lead = await leadsService.createLead(company.id, leadData, null, req);
    return res.status(201).json({
      success: true,
      message: lead.isDuplicateMerged
        ? lead.mergeMessage
        : "Your solar inquiry has been received. Our sales engineering team will call you shortly!",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}

async function trackPublicInquiry(req, res, next) {
  try {
    const rawPhone = (req.query.phone || "").trim();
    if (!rawPhone) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit phone number." });
    }
    const phoneClean = rawPhone.replace(/\D/g, "").slice(-10);
    const searchPhone = phoneClean.length >= 10 ? phoneClean : rawPhone;

    const lead = await prisma.lead.findFirst({
      where: {
        phone: { contains: searchPhone },
        archivedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { name: true, phone: true } },
        surveys: {
          select: { id: true, status: true, scheduledAt: true, approvedAt: true, roofType: true, roofAreaSqFt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        quotes: {
          select: { id: true, quoteNumber: true, status: true, totalAmount: true, capacityKw: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: `No active solar application found for phone ${rawPhone}. You can submit a new rooftop solar inquiry below!`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: lead.id,
        title: lead.title,
        contactName: lead.contactName,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        stage: lead.stage,
        desiredCapacityKw: Number(lead.desiredCapacityKw || 3),
        monthlyBillAmount: Number(lead.monthlyBillAmount || 0),
        assignedSalesRep: lead.assignedTo?.name || "Rahul Sharma (Sales Lead)",
        assignedRepPhone: lead.assignedTo?.phone || "+91 (800) 890-SOLAR",
        latestSurvey: lead.surveys[0] || null,
        latestQuote: lead.quotes[0] || null,
        createdAt: lead.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res, next) {
  try {
    const leads = await leadsService.getLeads(req.companyId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data: leads,
      pagination: leads.pagination || null,
    });
  } catch (error) {
    next(error);
  }
}

async function getKanban(req, res, next) {
  try {
    const kanbanData = await leadsService.getKanbanLeads(req.companyId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data: kanbanData,
    });
  } catch (error) {
    next(error);
  }
}

async function getSalesReps(req, res, next) {
  try {
    const reps = await leadsService.getSalesReps(req.companyId);
    return res.status(200).json({
      success: true,
      data: reps,
    });
  } catch (error) {
    next(error);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await leadsService.getLeadById(req.companyId, req.params.id);
    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}

async function createLead(req, res, next) {
  try {
    const lead = await leadsService.createLead(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: lead.isDuplicateMerged
        ? lead.mergeMessage
        : "Lead created and assigned successfully.",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}

async function updateChecklist(req, res, next) {
  try {
    const updated = await leadsService.updateChecklist(req.companyId, req.params.id, req.body, req.user.id, req);
    return res.status(200).json({
      success: true,
      message: updated.stage === "LOST"
        ? "Lead marked as Not Suitable (Lost)."
        : "Lead qualification checklist updated.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStage(req, res, next) {
  try {
    const updated = await leadsService.updateStage(req.companyId, req.params.id, req.body, req.user.id, req);
    return res.status(200).json({
      success: true,
      message: `Lead transitioned to ${updated.stage}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function reassignLead(req, res, next) {
  try {
    const updated = await leadsService.reassignLead(
      req.companyId,
      req.params.id,
      req.body.assignedToId,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Lead successfully reassigned to sales representative.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function logActivity(req, res, next) {
  try {
    const updated = await leadsService.logActivity(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Activity logged successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function archiveLead(req, res, next) {
  try {
    const archived = await leadsService.archiveLead(req.companyId, req.params.id, req.user.id, req);
    return res.status(200).json({
      success: true,
      message: "Lead archived successfully (never hard-deleted).",
      data: archived,
    });
  } catch (error) {
    next(error);
  }
}

async function createCustomerAccount(req, res, next) {
  try {
    const result = await leadsService.createCustomerAccountForLead(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function createCustomerDirect(req, res, next) {
  try {
    const result = await leadsService.createDirectCustomer(
      req.companyId,
      req.body,
      req.user.id,
      req
    );
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPublicLead,
  trackPublicInquiry,
  listLeads,
  getKanban,
  getSalesReps,
  getLead,
  createLead,
  updateChecklist,
  updateStage,
  reassignLead,
  logActivity,
  archiveLead,
  createCustomerAccount,
  createCustomerDirect,
};

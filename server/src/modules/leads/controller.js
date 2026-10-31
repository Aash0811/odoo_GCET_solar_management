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
      message: "Your solar inquiry has been received. Our sales engineering team will call you shortly!",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res, next) {
  try {
    const leads = await leadsService.getLeads(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: leads,
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
      message: "Lead created successfully.",
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
      message: "Lead qualification checklist updated.",
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

module.exports = {
  createPublicLead,
  listLeads,
  getLead,
  createLead,
  updateChecklist,
  updateStage,
  archiveLead,
};

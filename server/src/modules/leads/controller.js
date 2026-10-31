const leadsService = require("./service");

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
  listLeads,
  getLead,
  createLead,
  updateChecklist,
  updateStage,
  archiveLead,
};

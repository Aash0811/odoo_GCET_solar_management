const financeService = require("./service");

async function getJobCosting(req, res, next) {
  try {
    const costing = await financeService.getJobCosting(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: costing,
    });
  } catch (error) {
    next(error);
  }
}

async function getSubsidyTracker(req, res, next) {
  try {
    const subsidies = await financeService.getSubsidyTracker(req.companyId);
    return res.status(200).json({
      success: true,
      data: subsidies,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSubsidy(req, res, next) {
  try {
    const updated = await financeService.updateSubsidy(
      req.companyId,
      req.params.id,
      req.body,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: `Subsidy application updated to ${updated.status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function getTechnicianPayoutSummary(req, res, next) {
  try {
    const summary = await financeService.getTechnicianPayoutSummary(req.companyId);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

async function listInvoices(req, res, next) {
  try {
    const invoices = await financeService.getInvoices(req.companyId, req.query);
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadInvoicePdf(req, res, next) {
  try {
    const buffer = await financeService.getInvoicePdfBuffer(req.companyId, req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${req.params.id}.pdf`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

async function addCostEntry(req, res, next) {
  try {
    const cost = await financeService.addCostEntry(req.companyId, req.body, req.user.id, req);
    return res.status(201).json({
      success: true,
      message: "Cost entry recorded.",
      data: cost,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJobCosting,
  getSubsidyTracker,
  updateSubsidy,
  getTechnicianPayoutSummary,
  listInvoices,
  downloadInvoicePdf,
  addCostEntry,
};

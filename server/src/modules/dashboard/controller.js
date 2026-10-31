const dashboardService = require("./service");

async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getDashboardStats(req.companyId, req.query.timeframe || "month");
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

async function exportCsv(req, res, next) {
  try {
    const csvData = await dashboardService.exportDashboardCsv(req.companyId);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sunpower-solar-audit-${Date.now()}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

async function createShareLink(req, res, next) {
  try {
    const result = await dashboardService.createShareableLink(
      req.companyId,
      req.body.expiresInDays || 7,
      req.user.id
    );
    return res.status(201).json({
      success: true,
      message: "Shareable dashboard link generated.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSharedDashboard(req, res, next) {
  try {
    const token = req.query.token || req.params.token;
    if (!token) {
      return res.status(400).json({ success: false, message: "Share token is required." });
    }

    const data = await dashboardService.getSharedDashboard(token);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  exportCsv,
  createShareLink,
  getSharedDashboard,
};

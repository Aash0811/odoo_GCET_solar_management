const { getSingleCompany, updateSingleCompany } = require("../../utils/company");
const { recordAuditLog } = require("../../utils/audit");

async function getCompany(req, res, next) {
  try {
    const company = await getSingleCompany();
    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCompany(req, res, next) {
  try {
    const current = await getSingleCompany();
    const updated = await updateSingleCompany(req.body);

    await recordAuditLog({
      companyId: updated.id,
      actorId: req.user?.id || null,
      action: "UPDATE",
      entityType: "Company",
      entityId: updated.id,
      oldValue: current,
      newValue: updated,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCompany,
  updateCompany,
};


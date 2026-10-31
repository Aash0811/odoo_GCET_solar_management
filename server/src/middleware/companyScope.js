const { getSingleCompany } = require("../utils/company");

/**
 * Company Scope Middleware:
 * Binds all operations to the dedicated single company (SunPower Solutions Pvt Ltd).
 * Auto-resolves companyId if not explicitly passed, eliminating multi-tenant friction.
 */
async function companyScope(req, res, next) {
  try {
    const singleCompany = await getSingleCompany();

    // Prefer authenticated user's companyId, fallback to the single active company
    req.companyId = req.user?.companyId || singleCompany.id;
    req.company = singleCompany;

    // Auto-inject single companyId into request body if applicable
    if (req.body && typeof req.body === "object") {
      req.body.companyId = req.companyId;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = companyScope;

module.exports = companyScope;

function companyScope(req, res, next) {
  if (!req.user || !req.user.companyId) {
    return res.status(403).json({
      success: false,
      message: "Company scope missing from authentication context.",
    });
  }

  req.companyId = req.user.companyId;

  // Prevent cross-tenant companyId tampering if passed in body or query
  if (req.body && req.body.companyId && req.body.companyId !== req.companyId) {
    return res.status(403).json({
      success: false,
      message: "Cross-tenant company access violation.",
    });
  }

  if (req.query && req.query.companyId && req.query.companyId !== req.companyId) {
    return res.status(403).json({
      success: false,
      message: "Cross-tenant company access violation.",
    });
  }

  next();
}

module.exports = companyScope;

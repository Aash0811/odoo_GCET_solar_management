const warrantyService = require("./service");

async function searchWarranties(req, res, next) {
  try {
    const query = req.query.q || "";
    if (!query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' (customer name, phone, or serial number) is required.",
      });
    }

    const results = await warrantyService.searchWarranties(req.companyId, query);
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpiringWarranties(req, res, next) {
  try {
    const days = parseInt(req.query.days || "60", 10);
    const results = await warrantyService.getExpiringWarranties(req.companyId, days);
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

async function voidWarranty(req, res, next) {
  try {
    const updated = await warrantyService.voidWarranty(
      req.companyId,
      req.params.id,
      req.body.voidReason,
      req.user.id,
      req
    );
    return res.status(200).json({
      success: true,
      message: "Warranty voided.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchWarranties,
  getExpiringWarranties,
  voidWarranty,
};

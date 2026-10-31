const authService = require("./service");
const { recordAuditLog } = require("../../utils/audit");

async function login(req, res, next) {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginIdentifier = identifier || email || phone;

    const result = await authService.login(loginIdentifier, password, req);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await recordAuditLog({
        companyId: req.user.companyId,
        actorId: req.user.id,
        action: "LOGOUT",
        entityType: "User",
        entityId: req.user.id,
        req,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.registerCustomer(req.body, req);
    return res.status(201).json({
      success: true,
      message: "Customer account created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getMe,
  logout,
  register,
};

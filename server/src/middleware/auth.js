const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const env = require("../config/env");

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Your session has expired. Please log in again."
            : "Invalid authentication token.",
      });
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account is unavailable. Please contact an administrator.",
      });
    }

    if (!user.companyId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a company.",
      });
    }

    req.user = {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    req.companyId = user.companyId;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
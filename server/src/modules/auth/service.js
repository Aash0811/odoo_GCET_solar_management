const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const env = require("../../config/env");
const { recordAuditLog } = require("../../utils/audit");

async function login(identifier, password, req = null) {
  if (!identifier || !password) {
    const error = new Error("Email/phone and password are required.");
    error.statusCode = 400;
    throw error;
  }

  // Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { phone: identifier },
      ],
      isActive: true,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error("Invalid credentials or user does not exist.");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Record audit log
  await recordAuditLog({
    companyId: user.companyId,
    actorId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role, identifier },
    req,
  });

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
    },
  };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      companyId: true,
      lastLoginAt: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          gstNumber: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

module.exports = {
  login,
  getMe,
};

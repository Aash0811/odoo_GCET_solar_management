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

async function registerCustomer(data, req = null) {
  const { name, email, phone, password, address, city } = data;
  const cleanName = name ? name.trim() : "";
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = phone && phone.trim() ? phone.trim().replace(/[\s\-\(\)]/g, "") : null;

  if (!cleanName) {
    const error = new Error("Full name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!password || password.length < 6) {
    const error = new Error("Password must be at least 6 characters long.");
    error.statusCode = 400;
    throw error;
  }
  if (!cleanPhone && !cleanEmail) {
    const error = new Error("Phone number or email address is required.");
    error.statusCode = 400;
    throw error;
  }

  // Get active company
  const company = await prisma.company.findFirst({ where: { isActive: true } });
  if (!company) {
    const error = new Error("Active company profile not found.");
    error.statusCode = 400;
    throw error;
  }

  // Check if User already exists with email
  if (cleanEmail) {
    const existingEmail = await prisma.user.findFirst({
      where: { companyId: company.id, email: cleanEmail },
    });
    if (existingEmail) {
      const error = new Error(`An account with email "${cleanEmail}" already exists. Please sign in instead.`);
      error.statusCode = 409;
      throw error;
    }
  }

  // Check if User already exists with phone
  if (cleanPhone) {
    const existingPhone = await prisma.user.findFirst({
      where: { companyId: company.id, phone: cleanPhone },
    });
    if (existingPhone) {
      const error = new Error(
        cleanPhone === "9876543210"
          ? "Phone number 9876543210 is reserved for the demo customer. Please use your own mobile number (e.g. 9811122233) or sign in with customer@sunpower.com."
          : `An account with phone number "${cleanPhone}" already exists. Please sign in instead.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Find or create Customer entity in CRM
  let customer = await prisma.customer.findFirst({
    where: {
      companyId: company.id,
      OR: [
        ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ],
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        name: cleanName,
        phone: cleanPhone || `98${Date.now().toString().slice(-8)}`,
        email: cleanEmail,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        isActive: true,
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: cleanName,
        email: cleanEmail || customer.email,
        phone: cleanPhone || customer.phone,
        address: address ? address.trim() : customer.address,
        city: city ? city.trim() : customer.city,
      },
    });
  }

  // Create User with role: CUSTOMER
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role: "CUSTOMER",
      isActive: true,
      lastLoginAt: new Date(),
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

  // Record audit log
  await recordAuditLog({
    companyId: company.id,
    actorId: user.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    metadata: { role: "CUSTOMER", phone: user.phone, email: user.email },
    req,
  });

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || "7d" }
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
    customer,
  };
}

module.exports = {
  login,
  getMe,
  registerCustomer,
};

const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");

const VALID_ROLES = [
  "ADMIN",
  "SALESMAN",
  "ACCOUNTANT",
  "WAREHOUSE",
  "DELIVERY_AGENT",
  "TECHNICIAN",
  "SUPPORT",
  "CUSTOMER",
];

/**
 * List users with filtering by role, search keyword, and active status
 */
async function listUsers(companyId, filters = {}) {
  const { role, search, isActive } = filters;
  const where = { companyId };

  if (role && role !== "ALL") {
    if (VALID_ROLES.includes(role)) {
      where.role = role;
    }
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      managedWarehouses: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          zone: true,
        },
      },
      _count: {
        select: {
          assignedLeads: true,
          createdQuotes: true,
          createdOrders: true,
          assignedJobs: true,
          assignedTickets: true,
          managedWarehouses: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return users;
}

/**
 * Get user by ID with detailed assignments
 */
async function getUserById(companyId, id) {
  const user = await prisma.user.findFirst({
    where: { id, companyId },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      managedWarehouses: {
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          zone: true,
        },
      },
      assignedJobs: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: {
          id: true,
          jobNumber: true,
          status: true,
          scheduledDate: true,
        },
        take: 5,
      },
      assignedTickets: {
        where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          priority: true,
          status: true,
        },
        take: 5,
      },
      _count: {
        select: {
          assignedLeads: true,
          createdQuotes: true,
          createdOrders: true,
          assignedJobs: true,
          assignedTickets: true,
          managedWarehouses: true,
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

/**
 * Create a new user (Admin only)
 */
async function createUser(companyId, data, actorId, req = null) {
  const { name, email, phone, password, role, warehouseIds } = data;

  if (!name || !name.trim()) {
    const error = new Error("Name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!email && !phone) {
    const error = new Error("Either email or phone number is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error("Password must be at least 6 characters.");
    error.statusCode = 400;
    throw error;
  }

  const assignedRole = role || "SALESMAN";
  if (!VALID_ROLES.includes(assignedRole)) {
    const error = new Error(`Invalid role '${assignedRole}'. Must be one of: ${VALID_ROLES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  // Check unique email in company
  if (email && email.trim()) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        companyId,
        email: { equals: email.trim(), mode: "insensitive" },
      },
    });
    if (existingEmail) {
      const error = new Error(`Email '${email}' is already in use by another user.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Check unique phone in company
  if (phone && phone.trim()) {
    const existingPhone = await prisma.user.findFirst({
      where: {
        companyId,
        phone: { equals: phone.trim() },
      },
    });
    if (existingPhone) {
      const error = new Error(`Phone number '${phone}' is already in use by another user.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        companyId,
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: assignedRole,
        isActive: true,
      },
    });

    // If warehouses were assigned, update their managerId
    if (Array.isArray(warehouseIds) && warehouseIds.length > 0) {
      await tx.warehouse.updateMany({
        where: {
          id: { in: warehouseIds },
          companyId,
        },
        data: {
          managerId: newUser.id,
        },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "User",
        entityId: newUser.id,
        newValue: {
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
        },
        req,
      },
      tx
    );

    const created = await tx.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        managedWarehouses: {
          select: { id: true, name: true, city: true, zone: true },
        },
      },
    });

    return created;
  });
}

/**
 * Update user details, role, status, or reset password (Admin only)
 */
async function updateUser(companyId, id, data, actorId, req = null) {
  const user = await prisma.user.findFirst({
    where: { id, companyId },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const { name, email, phone, role, password, isActive, warehouseIds } = data;

  // Safety guard: Cannot demote or deactivate self if self is the only Admin
  if (id === actorId) {
    if (role && role !== "ADMIN") {
      const error = new Error("You cannot change your own role from ADMIN.");
      error.statusCode = 400;
      throw error;
    }
    if (isActive === false) {
      const error = new Error("You cannot deactivate your own admin account.");
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate role if changing
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      const error = new Error(`Invalid role '${role}'. Must be one of: ${VALID_ROLES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Check unique email if changing
  if (email && email.trim().toLowerCase() !== (user.email || "").toLowerCase()) {
    const duplicate = await prisma.user.findFirst({
      where: {
        companyId,
        id: { not: id },
        email: { equals: email.trim(), mode: "insensitive" },
      },
    });
    if (duplicate) {
      const error = new Error(`Email '${email}' is already in use by another user.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Check unique phone if changing
  if (phone && phone.trim() !== (user.phone || "")) {
    const duplicate = await prisma.user.findFirst({
      where: {
        companyId,
        id: { not: id },
        phone: { equals: phone.trim() },
      },
    });
    if (duplicate) {
      const error = new Error(`Phone number '${phone}' is already in use by another user.`);
      error.statusCode = 400;
      throw error;
    }
  }

  let newPasswordHash;
  if (password && password.trim()) {
    if (password.trim().length < 6) {
      const error = new Error("Password must be at least 6 characters.");
      error.statusCode = 400;
      throw error;
    }
    newPasswordHash = await bcrypt.hash(password.trim(), 10);
  }

  return await prisma.$transaction(async (tx) => {
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (email !== undefined) updatePayload.email = email ? email.trim().toLowerCase() : null;
    if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
    if (role !== undefined) updatePayload.role = role;
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);
    if (newPasswordHash) updatePayload.passwordHash = newPasswordHash;

    const updated = await tx.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    // Update managed warehouse assignments if provided
    if (Array.isArray(warehouseIds)) {
      // 1. Unlink warehouses previously managed by this user
      await tx.warehouse.updateMany({
        where: {
          companyId,
          managerId: id,
        },
        data: { managerId: null },
      });

      // 2. Link newly assigned warehouses
      if (warehouseIds.length > 0) {
        await tx.warehouse.updateMany({
          where: {
            companyId,
            id: { in: warehouseIds },
          },
          data: { managerId: id },
        });
      }
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        oldValue: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
        newValue: updated,
        req,
      },
      tx
    );

    const fullUser = await tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true,
        managedWarehouses: {
          select: { id: true, name: true, code: true, city: true, zone: true },
        },
        _count: {
          select: {
            assignedLeads: true,
            createdQuotes: true,
            createdOrders: true,
            assignedJobs: true,
            assignedTickets: true,
            managedWarehouses: true,
          },
        },
      },
    });

    return fullUser;
  });
}

/**
 * Change only the role of a user (Admin only)
 */
async function changeUserRole(companyId, id, newRole, actorId, req = null) {
  if (!VALID_ROLES.includes(newRole)) {
    const error = new Error(`Invalid role '${newRole}'. Must be one of: ${VALID_ROLES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: { id, companyId },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // Safety guard: Admin cannot remove own ADMIN role
  if (id === actorId && newRole !== "ADMIN") {
    const error = new Error("You cannot change your own role from ADMIN.");
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "STATUS_CHANGE",
      entityType: "User",
      entityId: id,
      oldValue: { role: user.role },
      newValue: { role: newRole },
      metadata: { reason: `Role changed from ${user.role} to ${newRole}` },
      req,
    },
    prisma
  );

  return updated;
}

/**
 * Delete a user (Admin only)
 * Safely unlinks managed warehouses, leads, jobs, tickets.
 * If user has commercial history (orders/quotes/invoices), archives the user to protect audit integrity.
 */
async function deleteUser(companyId, id, actorId, req = null) {
  if (id === actorId) {
    const error = new Error("You cannot delete your own admin account.");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: { id, companyId },
    include: {
      _count: {
        select: {
          createdQuotes: true,
          createdOrders: true,
          createdInvoices: true,
          createdPickLists: true,
          assignedJobs: true,
          assignedTickets: true,
          managedWarehouses: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // If user is an Admin, ensure at least one other active Admin remains
  if (user.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: {
        companyId,
        id: { not: id },
        role: "ADMIN",
        isActive: true,
      },
    });

    if (otherAdmins === 0) {
      const error = new Error("Cannot delete this user because they are the sole administrator of the company.");
      error.statusCode = 400;
      throw error;
    }
  }

  const hasCommercialHistory =
    user._count.createdQuotes > 0 ||
    user._count.createdOrders > 0 ||
    user._count.createdInvoices > 0 ||
    user._count.createdPickLists > 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Unassign managed warehouses
    await tx.warehouse.updateMany({
      where: { managerId: id, companyId },
      data: { managerId: null },
    });

    // 2. Unassign assigned leads
    await tx.lead.updateMany({
      where: { assignedToId: id, companyId },
      data: { assignedToId: null },
    });

    // 3. Unassign assigned installation jobs
    await tx.installationJob.updateMany({
      where: { technicianId: id, companyId },
      data: { technicianId: null },
    });

    // 4. Unassign assigned tickets
    await tx.ticket.updateMany({
      where: { assignedToId: id, companyId },
      data: { assignedToId: null },
    });

    // 5. If user has commercial records, archive to prevent breaking foreign keys
    if (hasCommercialHistory) {
      const timestamp = Date.now();
      const archivedUser = await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          name: `[Archived] ${user.name}`,
          email: user.email ? `deleted_${timestamp}_${user.email}` : null,
          phone: null,
        },
      });

      await recordAuditLog(
        {
          companyId,
          actorId,
          action: "ARCHIVE",
          entityType: "User",
          entityId: id,
          oldValue: { name: user.name, email: user.email, role: user.role },
          newValue: { isActive: false, status: "ARCHIVED" },
          metadata: {
            reason: `User archived due to ${user._count.createdOrders} sales orders and ${user._count.createdQuotes} quotations.`,
          },
          req,
        },
        tx
      );

      return {
        id,
        name: user.name,
        archived: true,
        message: `User '${user.name}' has been archived and deactivated. Historical commercial records (orders, quotes, invoices) have been preserved.`,
      };
    }

    // 6. Hard delete if no restricted commercial history
    const deleted = await tx.user.delete({
      where: { id },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "DELETE",
        entityType: "User",
        entityId: id,
        oldValue: { name: user.name, email: user.email, role: user.role },
        req,
      },
      tx
    );

    return {
      id,
      name: user.name,
      deleted: true,
      message: `User '${user.name}' (${user.role}) has been permanently deleted.`,
    };
  });
}

module.exports = {
  VALID_ROLES,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserRole,
  deleteUser,
};

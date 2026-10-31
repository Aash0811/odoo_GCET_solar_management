const prisma = require("../config/prisma");

async function recordAuditLog(options, tx = prisma) {
  try {
    const {
      companyId,
      actorId = null,
      action,
      entityType,
      entityId,
      oldValue = null,
      newValue = null,
      metadata = null,
      req = null,
    } = options;

    if (!companyId || !action || !entityType || !entityId) {
      console.warn("Audit log skipped: missing required parameters", { companyId, action, entityType, entityId });
      return null;
    }

    const ipAddress = req ? (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null) : null;
    const userAgent = req ? (req.headers["user-agent"] || null) : null;

    return await tx.auditLog.create({
      data: {
        companyId,
        actorId,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress: typeof ipAddress === "string" ? ipAddress.slice(0, 100) : null,
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 255) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error.message);
    return null;
  }
}

module.exports = {
  recordAuditLog,
};

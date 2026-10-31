const prisma = require("../config/prisma");

async function createNotification(options, tx = prisma) {
  try {
    const {
      companyId,
      userId = null,
      type,
      title,
      message,
      entityType = null,
      entityId = null,
    } = options;

    if (!companyId || !type || !title || !message) {
      console.warn("Notification skipped: missing parameters", { companyId, type, title });
      return null;
    }

    return await tx.notification.create({
      data: {
        companyId,
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
}

async function notifyRole(companyId, role, notificationData, tx = prisma) {
  try {
    const users = await tx.user.findMany({
      where: {
        companyId,
        role,
        isActive: true,
      },
      select: { id: true },
    });

    const creations = users.map((u) =>
      createNotification(
        {
          ...notificationData,
          companyId,
          userId: u.id,
        },
        tx
      )
    );

    return await Promise.all(creations);
  } catch (error) {
    console.error("Failed to notify role:", error.message);
    return [];
  }
}

module.exports = {
  createNotification,
  notifyRole,
};

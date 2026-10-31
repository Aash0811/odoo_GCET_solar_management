const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");

async function searchWarranties(companyId, query) {
  const q = query.trim();

  // Search by serial number OR customer phone OR customer name
  const warranties = await prisma.warranty.findMany({
    where: {
      companyId,
      OR: [
        { serialNumber: { serial: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, email: true, address: true },
      },
      serialNumber: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: true, warrantyYears: true },
          },
          order: {
            select: { id: true, orderNumber: true, confirmedAt: true },
          },
        },
      },
    },
    orderBy: { endDate: "desc" },
  });

  const now = Date.now();

  return warranties.map((w) => {
    const endMs = new Date(w.endDate).getTime();
    const diffDays = Math.ceil((endMs - now) / 86400000);
    const isExpired = diffDays <= 0 || w.status === "EXPIRED";
    const status = w.status === "VOID" ? "VOID" : isExpired ? "EXPIRED" : "ACTIVE";

    return {
      id: w.id,
      serialNumberId: w.serialNumberId,
      serial: w.serialNumber.serial,
      product: w.serialNumber.product,
      customer: w.customer,
      order: w.serialNumber.order,
      status,
      startDate: w.startDate,
      endDate: w.endDate,
      daysLeft: isExpired ? 0 : diffDays,
      expiredDaysAgo: isExpired ? Math.abs(diffDays) : 0,
      voidedAt: w.voidedAt,
      voidReason: w.voidReason,
    };
  });
}

async function getExpiringWarranties(companyId, days = 60) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 86400000);

  const warranties = await prisma.warranty.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      endDate: {
        gte: now,
        lte: future,
      },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      serialNumber: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
    },
    orderBy: { endDate: "asc" },
  });

  return warranties.map((w) => {
    const diffDays = Math.ceil((new Date(w.endDate).getTime() - Date.now()) / 86400000);
    return {
      ...w,
      daysLeft: Math.max(0, diffDays),
    };
  });
}

async function voidWarranty(companyId, id, voidReason, actorId, req = null) {
  const warranty = await prisma.warranty.findFirst({
    where: { id, companyId },
  });

  if (!warranty) {
    const error = new Error("Warranty not found.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.warranty.update({
      where: { id },
      data: {
        status: "VOID",
        voidedAt: new Date(),
        voidReason,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Warranty",
        entityId: id,
        oldValue: { status: warranty.status },
        newValue: { status: "VOID", voidReason },
        req,
      },
      tx
    );

    return updated;
  });
}

module.exports = {
  searchWarranties,
  getExpiringWarranties,
  voidWarranty,
};

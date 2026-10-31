const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { createNotification } = require("../../utils/notify");

async function getLeads(companyId, filters = {}) {
  const { stage, assignedToId, includeArchived = "false", search } = filters;

  const where = {
    companyId,
  };

  if (includeArchived !== "true") {
    where.archivedAt = null;
  }

  if (stage) {
    where.stage = stage;
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.lead.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      customer: {
        select: { id: true, name: true, phone: true },
      },
      surveys: {
        select: { id: true, status: true, scheduledAt: true, approvedAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      quotes: {
        select: { id: true, quoteNumber: true, status: true, totalAmount: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getLeadById(companyId, id) {
  const lead = await prisma.lead.findFirst({
    where: { id, companyId },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, phone: true },
      },
      customer: true,
      surveys: {
        include: {
          photos: true,
        },
        orderBy: { createdAt: "desc" },
      },
      quotes: {
        include: {
          lines: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    const error = new Error("Lead not found.");
    error.statusCode = 404;
    throw error;
  }

  return lead;
}

async function createLead(companyId, data, actorId, req = null) {
  return await prisma.$transaction(async (tx) => {
    // Check if customer already exists by phone, or create customer
    let customer = null;
    if (data.phone) {
      customer = await tx.customer.findFirst({
        where: { companyId, phone: data.phone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            companyId,
            name: data.contactName,
            phone: data.phone,
            email: data.email || null,
            address: data.address || null,
          },
        });
      }
    }

    const lead = await tx.lead.create({
      data: {
        companyId,
        customerId: customer ? customer.id : null,
        title: data.title,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        source: data.source || null,
        notes: data.notes || null,
        assignedToId: data.assignedToId || actorId || null,
        desiredCapacityKw: data.desiredCapacityKw || null,
        monthlyBillAmount: data.monthlyBillAmount || null,
        shadowFreeArea: Boolean(data.shadowFreeArea),
        monthlyBill: Boolean(data.monthlyBill),
        gridSuitable: Boolean(data.gridSuitable),
        stage: "NEW",
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Lead",
        entityId: lead.id,
        newValue: { stage: lead.stage, title: lead.title },
        req,
      },
      tx
    );

    if (data.assignedToId && data.assignedToId !== actorId) {
      await createNotification(
        {
          companyId,
          userId: data.assignedToId,
          type: "LEAD_ASSIGNED",
          title: "New Lead Assigned",
          message: `You have been assigned to lead '${lead.title}' (${lead.contactName}).`,
          entityType: "Lead",
          entityId: lead.id,
        },
        tx
      );
    }

    return lead;
  });
}

async function updateChecklist(companyId, id, checklistData, actorId, req = null) {
  const lead = await getLeadById(companyId, id);

  const isQualified =
    checklistData.shadowFreeArea &&
    checklistData.monthlyBill &&
    checklistData.gridSuitable;

  const nextStage =
    isQualified && (lead.stage === "NEW" || lead.stage === "CONTACTED")
      ? "QUALIFIED"
      : lead.stage;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        shadowFreeArea: checklistData.shadowFreeArea,
        monthlyBill: checklistData.monthlyBill,
        gridSuitable: checklistData.gridSuitable,
        monthlyBillAmount: checklistData.monthlyBillAmount !== undefined ? checklistData.monthlyBillAmount : lead.monthlyBillAmount,
        desiredCapacityKw: checklistData.desiredCapacityKw !== undefined ? checklistData.desiredCapacityKw : lead.desiredCapacityKw,
        stage: nextStage,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "Lead",
        entityId: id,
        oldValue: {
          shadowFreeArea: lead.shadowFreeArea,
          monthlyBill: lead.monthlyBill,
          gridSuitable: lead.gridSuitable,
          stage: lead.stage,
        },
        newValue: {
          shadowFreeArea: updated.shadowFreeArea,
          monthlyBill: updated.monthlyBill,
          gridSuitable: updated.gridSuitable,
          stage: updated.stage,
        },
        req,
      },
      tx
    );

    return updated;
  });
}

async function updateStage(companyId, id, stageData, actorId, req = null) {
  const lead = await getLeadById(companyId, id);
  const { stage: newStage, lossReason } = stageData;

  if (lead.stage === newStage) {
    return lead;
  }

  // Check stage progression rules
  if (newStage === "LOST" && !lossReason) {
    const error = new Error("A loss reason is mandatory when marking a lead as LOST.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        stage: newStage,
        lossReason: newStage === "LOST" ? lossReason : lead.lossReason,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Lead",
        entityId: id,
        oldValue: { stage: lead.stage },
        newValue: { stage: newStage, lossReason },
        req,
      },
      tx
    );

    return updated;
  });
}

async function archiveLead(companyId, id, actorId, req = null) {
  // Business Rule 1: Leads are NEVER hard-deleted (archive only).
  const lead = await getLeadById(companyId, id);

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        archivedAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "ARCHIVE",
        entityType: "Lead",
        entityId: id,
        oldValue: { archivedAt: lead.archivedAt },
        newValue: { archivedAt: updated.archivedAt },
        req,
      },
      tx
    );

    return updated;
  });
}

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateChecklist,
  updateStage,
  archiveLead,
};

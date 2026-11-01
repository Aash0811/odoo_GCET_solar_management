const prisma = require("../../config/prisma");
const bcrypt = require("bcrypt");
const { recordAuditLog } = require("../../utils/audit");
const { createNotification, notifyRole } = require("../../utils/notify");

async function getLeads(companyId, filters = {}, currentUser = null) {
  const { stage, assignedToId, includeArchived = "false", search, source, myLeadsOnly, page, limit, q } = filters;

  const where = {
    companyId,
  };

  if (includeArchived !== "true") {
    where.archivedAt = null;
  }

  if (stage && stage !== "ALL") {
    where.stage = stage;
  }

  if (source && source !== "ALL") {
    where.source = source;
  }

  // Role & assignee filtering:
  if (myLeadsOnly === "true" && currentUser?.id) {
    where.assignedToId = currentUser.id;
  } else if (assignedToId && assignedToId !== "ALL") {
    where.assignedToId = assignedToId;
  }

  const searchQuery = (search || q || "").trim();
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { contactName: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { address: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const hasPagination = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * pageSize;

  const [total, leads] = await prisma.$transaction([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      ...(hasPagination ? { skip, take: pageSize } : {}),
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true, city: true },
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
    }),
  ]);

  leads.pagination = {
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return leads;
}

async function getKanbanLeads(companyId, filters = {}, currentUser = null) {
  const { stage, assignedToId, includeArchived = "false", search, source, myLeadsOnly, page = 1, limit = 5, q } = filters;

  const baseWhere = {
    companyId,
  };

  if (includeArchived !== "true") {
    baseWhere.archivedAt = null;
  }

  if (source && source !== "ALL") {
    baseWhere.source = source;
  }

  if (myLeadsOnly === "true" && currentUser?.id) {
    baseWhere.assignedToId = currentUser.id;
  } else if (assignedToId && assignedToId !== "ALL") {
    baseWhere.assignedToId = assignedToId;
  }

  const searchQuery = (search || q || "").trim();
  if (searchQuery) {
    baseWhere.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { contactName: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { address: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const standardIncludes = {
    assignedTo: {
      select: { id: true, name: true, email: true, phone: true, role: true },
    },
    customer: {
      select: { id: true, name: true, phone: true, email: true, city: true },
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
  };

  const STAGES = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "SURVEY_SCHEDULED",
    "SURVEY_DONE",
    "SURVEY_APPROVED",
    "QUOTED",
    "WON",
    "LOST",
  ];

  const pageSize = Math.min(50, Math.max(1, Number(limit) || 5));
  const pageNum = Math.max(1, Number(page) || 1);

  // If a single stage is requested (e.g. column-level page turn)
  if (stage && stage !== "ALL" && STAGES.includes(stage)) {
    const stageWhere = { ...baseWhere, stage };
    const skip = (pageNum - 1) * pageSize;

    const [total, items] = await prisma.$transaction([
      prisma.lead.count({ where: stageWhere }),
      prisma.lead.findMany({
        where: stageWhere,
        skip,
        take: pageSize,
        include: standardIncludes,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      stage,
      items,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  // Otherwise, fetch all stages with parallel batch queries in a single transaction
  const queries = [];
  for (const s of STAGES) {
    const sWhere = { ...baseWhere, stage: s };
    queries.push(prisma.lead.count({ where: sWhere }));
    queries.push(
      prisma.lead.findMany({
        where: sWhere,
        skip: 0,
        take: pageSize,
        include: standardIncludes,
        orderBy: { createdAt: "desc" },
      })
    );
  }

  const results = await prisma.$transaction(queries);
  const stageData = {};
  let overallTotal = 0;

  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const total = results[i * 2];
    const items = results[i * 2 + 1];
    overallTotal += total;

    stageData[s] = {
      items,
      total,
      page: 1,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  return {
    stages: stageData,
    totalCount: overallTotal,
    limit: pageSize,
  };
}

async function getLeadById(companyId, id) {
  const lead = await prisma.lead.findFirst({
    where: { id, companyId },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, phone: true, role: true },
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

async function getSalesReps(companyId) {
  const users = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      role: { in: ["SALESMAN", "ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  const repsWithCounts = await Promise.all(
    users.map(async (u) => {
      const activeLeadsCount = await prisma.lead.count({
        where: {
          companyId,
          assignedToId: u.id,
          archivedAt: null,
          stage: { notIn: ["WON", "LOST"] },
        },
      });
      return { ...u, activeLeadsCount };
    })
  );

  return repsWithCounts;
}

async function createLead(companyId, data, actorId, req = null) {
  return await prisma.$transaction(async (tx) => {
    const rawPhone = (data.phone || "").trim();
    const phoneClean = rawPhone.replace(/\D/g, "").slice(-10);
    const searchPhone = phoneClean.length >= 10 ? phoneClean : rawPhone;

    // ─────────────────────────────────────────────────────────────
    // 1. DUPLICATE DETECTION & AUTO-MERGING (Phone or Address)
    // ─────────────────────────────────────────────────────────────
    const duplicateConditions = [{ phone: { contains: searchPhone } }];
    if (data.address && data.address.trim().length > 8) {
      duplicateConditions.push({
        address: { equals: data.address.trim(), mode: "insensitive" },
      });
    }

    const existingActiveLead = await tx.lead.findFirst({
      where: {
        companyId,
        archivedAt: null,
        stage: { notIn: ["WON", "LOST"] },
        OR: duplicateConditions,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: true,
      },
    });

    if (existingActiveLead) {
      const mergeNotice = `\n[${new Date().toLocaleString("en-IN")} | Merged Inquiry from ${data.source || "Web"}]: Title: "${data.title || "Inquiry"}", Desired Capacity: ${data.desiredCapacityKw || 3} kW, Subsidy Interest: ${data.subsidyInterest ? "Yes" : "No"}${data.notes ? ` | Remarks: ${data.notes}` : ""}`;
      const updatedNotes = (existingActiveLead.notes || "") + mergeNotice;

      const updateData = {
        notes: updatedNotes,
        lastContactAt: new Date(),
      };
      if (!existingActiveLead.email && data.email) updateData.email = data.email.trim();
      if (!existingActiveLead.address && data.address) updateData.address = data.address.trim();
      if (data.desiredCapacityKw && Number(data.desiredCapacityKw) > Number(existingActiveLead.desiredCapacityKw || 0)) {
        updateData.desiredCapacityKw = Number(data.desiredCapacityKw);
      }
      if (data.monthlyBillAmount && !existingActiveLead.monthlyBillAmount) {
        updateData.monthlyBillAmount = Number(data.monthlyBillAmount);
      }

      const merged = await tx.lead.update({
        where: { id: existingActiveLead.id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          customer: true,
        },
      });

      await recordAuditLog(
        {
          companyId,
          actorId: actorId || null,
          action: "UPDATE",
          entityType: "Lead",
          entityId: merged.id,
          newValue: {
            isDuplicateMerged: true,
            source: data.source,
            phone: data.phone,
          },
          req,
        },
        tx
      );

      if (merged.assignedToId) {
        await createNotification(
          {
            companyId,
            userId: merged.assignedToId,
            type: "LEAD_ASSIGNED",
            title: "Duplicate Enquiry Merged",
            message: `A duplicate inquiry from ${data.contactName} (${data.phone}) was automatically merged into active lead '${merged.title}'.`,
            entityType: "Lead",
            entityId: merged.id,
          },
          tx
        );
      }

      return {
        ...merged,
        isDuplicateMerged: true,
        mergeMessage: `Existing active lead found for ${data.phone}. Enquiry details merged into lead '${merged.title}'.`,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. AUTO-ASSIGNMENT (Load-Balanced Round-Robin)
    // ─────────────────────────────────────────────────────────────
    let assignedToId = data.assignedToId || actorId || null;

    if (!assignedToId) {
      const salesReps = await tx.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: ["SALESMAN", "ADMIN"] },
        },
        select: { id: true, name: true },
      });

      if (salesReps.length > 0) {
        const counts = await Promise.all(
          salesReps.map(async (rep) => {
            const count = await tx.lead.count({
              where: {
                companyId,
                assignedToId: rep.id,
                archivedAt: null,
                stage: { notIn: ["WON", "LOST"] },
              },
            });
            return { id: rep.id, count };
          })
        );
        counts.sort((a, b) => a.count - b.count);
        assignedToId = counts[0].id;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CUSTOMER RECORD CREATION / LINKAGE
    // ─────────────────────────────────────────────────────────────
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

    // Compose formatted notes with system requirement & subsidy interest
    const initialNotesParts = [];
    if (data.systemType) initialNotesParts.push(`System Type: ${data.systemType}`);
    if (data.subsidyInterest !== undefined) {
      initialNotesParts.push(`PM Surya Ghar Subsidy: ${data.subsidyInterest ? "Yes, Interested" : "No"}`);
    }
    if (data.notes) initialNotesParts.push(`Notes: ${data.notes}`);
    const initialNotes = initialNotesParts.length > 0 ? initialNotesParts.join(" | ") : null;

    const lead = await tx.lead.create({
      data: {
        companyId,
        customerId: customer ? customer.id : null,
        title: data.title || `${data.desiredCapacityKw || 3} kW System - ${data.contactName}`,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        source: data.source || "WEB_FORM",
        notes: initialNotes,
        assignedToId,
        desiredCapacityKw: data.desiredCapacityKw ? Number(data.desiredCapacityKw) : null,
        monthlyBillAmount: data.monthlyBillAmount ? Number(data.monthlyBillAmount) : null,
        shadowFreeArea: Boolean(data.shadowFreeArea),
        monthlyBill: Boolean(data.monthlyBill),
        gridSuitable: Boolean(data.gridSuitable),
        stage: "NEW",
        lastContactAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: true,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId: actorId || null,
        action: "CREATE",
        entityType: "Lead",
        entityId: lead.id,
        newValue: { stage: lead.stage, title: lead.title, source: lead.source, assignedToId },
        req,
      },
      tx
    );

    if (assignedToId) {
      await createNotification(
        {
          companyId,
          userId: assignedToId,
          type: "LEAD_ASSIGNED",
          title: "New Lead Assigned",
          message: `You have been assigned to lead '${lead.title}' (${lead.contactName}, ${lead.phone}).`,
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

  // If user explicitly marks as NOT_SUITABLE
  if (checklistData.decision === "NOT_SUITABLE") {
    const reason =
      checklistData.lossReason ||
      "Roof or electrical grid deemed not suitable during technical qualification check.";

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          shadowFreeArea: Boolean(checklistData.shadowFreeArea),
          monthlyBill: Boolean(checklistData.monthlyBill),
          gridSuitable: Boolean(checklistData.gridSuitable),
          stage: "LOST",
          lossReason: reason,
          lastContactAt: new Date(),
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
          newValue: { stage: "LOST", lossReason: reason },
          req,
        },
        tx
      );

      return updated;
    });
  }

  const isQualified =
    Boolean(checklistData.shadowFreeArea) &&
    Boolean(checklistData.monthlyBill) &&
    Boolean(checklistData.gridSuitable);

  let nextStage = lead.stage;
  if (isQualified && (lead.stage === "NEW" || lead.stage === "CONTACTED")) {
    nextStage = "QUALIFIED";
  } else if (!isQualified && lead.stage === "QUALIFIED") {
    nextStage = "CONTACTED";
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        shadowFreeArea: Boolean(checklistData.shadowFreeArea),
        monthlyBill: Boolean(checklistData.monthlyBill),
        gridSuitable: Boolean(checklistData.gridSuitable),
        monthlyBillAmount:
          checklistData.monthlyBillAmount !== undefined
            ? checklistData.monthlyBillAmount
            : lead.monthlyBillAmount,
        desiredCapacityKw:
          checklistData.desiredCapacityKw !== undefined
            ? checklistData.desiredCapacityKw
            : lead.desiredCapacityKw,
        stage: nextStage,
        lastContactAt: new Date(),
      },
    });

    // Module 2 Feature 1: Auto-create survey task when lead is Qualified
    if (nextStage === "QUALIFIED") {
      const existingSurvey = await tx.survey.findFirst({
        where: { leadId: id, companyId },
      });
      if (!existingSurvey) {
        const newSurvey = await tx.survey.create({
          data: {
            companyId,
            leadId: id,
            status: "REQUESTED",
            recommendedKw: checklistData.desiredCapacityKw || lead.desiredCapacityKw || 3,
            shadowFreeArea: true,
            monthlyBill: true,
            gridSuitable: true,
            surveyedById: null, // Admin manually assigns technician
          },
        });

        await notifyRole(
          companyId,
          "ADMIN",
          {
            type: "GENERAL",
            title: "Site Survey Requires Technician Assignment",
            message: `Lead '${lead.title}' (${lead.contactName}) was qualified. Please assign a technician for site survey.`,
            entityType: "Survey",
            entityId: newSurvey.id,
          },
          tx
        );
      }
    }

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

  if (lead.stage === newStage && (!lossReason || lead.lossReason === lossReason)) {
    return lead;
  }

  // Mandatory loss reason capture
  if (newStage === "LOST" && (!lossReason || !lossReason.trim())) {
    const error = new Error("A loss reason is mandatory when marking a lead as LOST.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        stage: newStage,
        lossReason: newStage === "LOST" ? lossReason.trim() : lead.lossReason,
        lastContactAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: true,
      },
    });

    // Module 2 Feature 1: Auto-create survey task when lead is Qualified
    if (newStage === "QUALIFIED") {
      const existingSurvey = await tx.survey.findFirst({
        where: { leadId: id, companyId },
      });
      if (!existingSurvey) {
        const newSurvey = await tx.survey.create({
          data: {
            companyId,
            leadId: id,
            status: "REQUESTED",
            recommendedKw: lead.desiredCapacityKw || 3,
            shadowFreeArea: true,
            monthlyBill: true,
            gridSuitable: true,
            surveyedById: null, // Admin manually assigns technician
          },
        });

        await notifyRole(
          companyId,
          "ADMIN",
          {
            type: "GENERAL",
            title: "Site Survey Requires Technician Assignment",
            message: `Lead '${lead.title}' (${lead.contactName}) was qualified. Please assign a technician for site survey.`,
            entityType: "Survey",
            entityId: newSurvey.id,
          },
          tx
        );
      }
    }

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

async function reassignLead(companyId, id, targetUserId, actorId, req = null) {
  const lead = await getLeadById(companyId, id);

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, companyId, isActive: true },
  });

  if (!targetUser) {
    const error = new Error("Selected sales representative not found.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: { assignedToId: targetUser.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        customer: true,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "Lead",
        entityId: id,
        oldValue: { assignedToId: lead.assignedToId },
        newValue: { assignedToId: targetUser.id },
        metadata: { action: "REASSIGN", newAssignee: targetUser.name },
        req,
      },
      tx
    );

    await createNotification(
      {
        companyId,
        userId: targetUser.id,
        type: "LEAD_ASSIGNED",
        title: "Lead Reassigned to You",
        message: `Lead '${lead.title}' (${lead.contactName}) has been reassigned to you.`,
        entityType: "Lead",
        entityId: id,
      },
      tx
    );

    return updated;
  });
}

async function logActivity(companyId, id, activityData, actorId, req = null) {
  const lead = await getLeadById(companyId, id);
  const { type = "CALL", outcome, notes, followUpAt } = activityData;

  const actorUser = actorId
    ? await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } })
    : null;
  const actorName = actorUser?.name || "Sales Rep";

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  let logHeader = `[${timestamp} | ${type} by ${actorName}]`;
  if (outcome) logHeader += ` Outcome: ${outcome}`;

  let entry = `\n${logHeader}\n${notes.trim()}`;
  if (followUpAt) {
    const fDate = new Date(followUpAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    entry += `\n⏰ Next Follow-Up Scheduled: ${fDate}`;
  }

  const newNotes = (lead.notes || "") + entry;

  let newStage = lead.stage;
  if (type === "CALL" && lead.stage === "NEW") {
    newStage = "CONTACTED";
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        notes: newNotes,
        stage: newStage,
        lastContactAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: true,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "Lead",
        entityId: id,
        metadata: {
          activityType: type,
          outcome,
          followUpAt,
        },
        req,
      },
      tx
    );

    return updated;
  });
}

async function archiveLead(companyId, id, actorId, req = null) {
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

async function createCustomerAccountForLead(companyId, leadId, accountData = {}, actorId, req = null) {
  const lead = await getLeadById(companyId, leadId);

  const cleanName = (accountData.name || lead.contactName || "Valued Customer").trim();
  const cleanPhone = (accountData.phone || lead.phone || "").trim();
  const cleanEmail = (accountData.email || lead.email || "").trim().toLowerCase() || null;
  const cleanAddress = (accountData.address || lead.address || "").trim() || null;
  const cleanCity = (accountData.city || "").trim() || null;

  if (!cleanPhone) {
    const error = new Error("Customer phone number is required to create an account.");
    error.statusCode = 400;
    throw error;
  }

  const plainPassword =
    accountData.password && accountData.password.trim().length >= 6
      ? accountData.password.trim()
      : `Solar@${Math.floor(1000 + Math.random() * 9000)}`;

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  return await prisma.$transaction(async (tx) => {
    let customer = null;
    if (lead.customerId) {
      customer = await tx.customer.findFirst({
        where: { id: lead.customerId, companyId },
      });
    }

    if (!customer) {
      customer = await tx.customer.findFirst({
        where: {
          companyId,
          OR: [{ phone: cleanPhone }, ...(cleanEmail ? [{ email: cleanEmail }] : [])],
        },
      });
    }

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          companyId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          city: cleanCity,
          isActive: true,
        },
      });
    } else {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: cleanName,
          phone: cleanPhone || customer.phone,
          email: cleanEmail || customer.email,
          address: cleanAddress || customer.address,
          city: cleanCity || customer.city,
          isActive: true,
        },
      });
    }

    await tx.lead.update({
      where: { id: leadId },
      data: {
        customerId: customer.id,
        stage: lead.stage === "NEW" ? "CONTACTED" : lead.stage,
      },
    });

    const userConditions = [{ phone: cleanPhone }];
    if (cleanEmail) userConditions.push({ email: cleanEmail });

    const existingUser = await tx.user.findFirst({
      where: {
        companyId,
        OR: userConditions,
      },
    });

    let user;
    if (existingUser) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          companyId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
        },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "CustomerAccount",
        entityId: customer.id,
        newValue: {
          customerId: customer.id,
          userId: user.id,
          phone: cleanPhone,
          email: cleanEmail,
          leadId,
        },
        req,
      },
      tx
    );

    return {
      customerId: customer.id,
      customerName: customer.name,
      userId: user.id,
      phone: customer.phone,
      email: customer.email,
      plainPassword,
      leadId,
      portalUrl: "/login",
      message: "Customer Portal account created and credentials assigned successfully.",
    };
  });
}

async function createDirectCustomer(companyId, data = {}, actorId, req = null) {
  const cleanName = (data.name || "").trim();
  const cleanPhone = (data.phone || "").trim();
  const cleanEmail = (data.email || "").trim().toLowerCase() || null;
  const cleanAddress = (data.address || "").trim() || null;
  const cleanCity = (data.city || "").trim() || null;
  const cleanState = (data.state || "").trim() || null;
  const cleanPostalCode = (data.postalCode || "").trim() || null;

  if (!cleanName || !cleanPhone) {
    const error = new Error("Customer Name and Phone number are required.");
    error.statusCode = 400;
    throw error;
  }

  const plainPassword =
    data.password && data.password.trim().length >= 6
      ? data.password.trim()
      : `Solar@${Math.floor(1000 + Math.random() * 9000)}`;

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  return await prisma.$transaction(async (tx) => {
    const searchConditions = [{ phone: cleanPhone }];
    if (cleanEmail) searchConditions.push({ email: cleanEmail });

    let customer = await tx.customer.findFirst({
      where: {
        companyId,
        OR: searchConditions,
      },
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          companyId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          city: cleanCity,
          state: cleanState,
          postalCode: cleanPostalCode,
          notes: data.notes || null,
          isActive: true,
        },
      });
    } else {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail || customer.email,
          address: cleanAddress || customer.address,
          city: cleanCity || customer.city,
          state: cleanState || customer.state,
          postalCode: cleanPostalCode || customer.postalCode,
          notes: data.notes || customer.notes,
          isActive: true,
        },
      });
    }

    const existingUser = await tx.user.findFirst({
      where: {
        companyId,
        OR: searchConditions,
      },
    });

    let user;
    if (existingUser) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          companyId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
        },
      });
    }

    let lead = null;
    if (data.createLead !== false) {
      lead = await tx.lead.create({
        data: {
          companyId,
          customerId: customer.id,
          title: data.leadTitle || `${data.desiredCapacityKw || 3} kW System - ${cleanName}`,
          contactName: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          source: data.source || "SALES_DIRECT",
          notes: data.notes || "Customer registered directly by sales team.",
          desiredCapacityKw: data.desiredCapacityKw ? Number(data.desiredCapacityKw) : 3,
          monthlyBillAmount: data.monthlyBillAmount ? Number(data.monthlyBillAmount) : null,
          shadowFreeArea: true,
          monthlyBill: true,
          gridSuitable: true,
          stage: "QUALIFIED",
          assignedToId: actorId,
          lastContactAt: new Date(),
        },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Customer",
        entityId: customer.id,
        newValue: {
          customerId: customer.id,
          userId: user.id,
          phone: cleanPhone,
          leadId: lead ? lead.id : null,
        },
        req,
      },
      tx
    );

    return {
      customerId: customer.id,
      customerName: customer.name,
      userId: user.id,
      phone: customer.phone,
      email: customer.email,
      plainPassword,
      lead,
      portalUrl: "/login",
      message:
        "Customer created, portal credentials generated, and lead added to pipeline successfully.",
    };
  });
}

module.exports = {
  getLeads,
  getKanbanLeads,
  getLeadById,
  getSalesReps,
  createLead,
  updateChecklist,
  updateStage,
  reassignLead,
  logActivity,
  archiveLead,
  createCustomerAccountForLead,
  createDirectCustomer,
};

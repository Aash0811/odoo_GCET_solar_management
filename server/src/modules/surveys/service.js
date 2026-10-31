const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { createNotification } = require("../../utils/notify");
const { uploadToCloudinary } = require("../../middleware/upload");

function parseSurveyNotes(notes) {
  if (!notes) return {};
  const metricsMatch = notes.match(/\[SURVEY_METRICS\]:\s*(.*?)(?:\n|$)/);
  if (!metricsMatch) return {};

  const metricsStr = metricsMatch[1];
  const result = {};
  metricsStr.split("|").forEach((pair) => {
    const [k, v] = pair.split("=");
    if (k && v !== undefined) {
      if (k === "direction") result.roofDirection = v;
      if (k === "tilt") result.tiltAngle = Number(v) || v;
      if (k === "cable") result.cableDistanceMeters = Number(v) || v;
      if (k === "gps") result.gpsCoordinates = v;
      if (k === "structure") result.structureType = v;
    }
  });
  return result;
}

function cleanUserNotes(notes) {
  if (!notes) return "";
  return notes.replace(/\[SURVEY_METRICS\]:\s*.*?(?:\n|$)/, "").trim();
}

async function getSurveys(companyId, filters = {}, user = null) {
  const { status, surveyedById, search, q, page, limit } = filters;
  const where = { companyId };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (surveyedById && surveyedById !== "ALL") {
    where.surveyedById = surveyedById;
  }

  const searchQuery = (search || q || "").trim();
  if (searchQuery) {
    where.OR = [
      { notes: { contains: searchQuery, mode: "insensitive" } },
      { lead: { contactName: { contains: searchQuery, mode: "insensitive" } } },
      { lead: { phone: { contains: searchQuery, mode: "insensitive" } } },
      { lead: { email: { contains: searchQuery, mode: "insensitive" } } },
      { lead: { address: { contains: searchQuery, mode: "insensitive" } } },
      { lead: { title: { contains: searchQuery, mode: "insensitive" } } },
      { lead: { customer: { name: { contains: searchQuery, mode: "insensitive" } } } },
    ];
  }

  const hasPagination = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * pageSize;

  const [total, surveys] = await prisma.$transaction([
    prisma.survey.count({ where }),
    prisma.survey.findMany({
      where,
      ...(hasPagination ? { skip, take: pageSize } : {}),
      include: {
        lead: {
          include: {
            customer: true,
            assignedTo: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        photos: {
          orderBy: { uploadedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Fetch technician names for surveyedById
  const techIds = [...new Set(surveys.map((s) => s.surveyedById).filter(Boolean))];
  const techUsers =
    techIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: techIds } },
          select: { id: true, name: true, email: true, phone: true },
        })
      : [];
  const techMap = Object.fromEntries(techUsers.map((t) => [t.id, t]));

  const mapped = surveys.map((s) => {
    const metrics = parseSurveyNotes(s.notes);
    return {
      ...s,
      ...metrics,
      cleanNotes: cleanUserNotes(s.notes),
      surveyedBy: s.surveyedById ? techMap[s.surveyedById] || null : null,
    };
  });

  mapped.pagination = {
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return mapped;
}

async function getSurveyById(companyId, id) {
  const survey = await prisma.survey.findFirst({
    where: { id, companyId },
    include: {
      lead: {
        include: {
          customer: true,
          assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      photos: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!survey) {
    const error = new Error("Survey not found.");
    error.statusCode = 404;
    throw error;
  }

  let surveyedBy = null;
  if (survey.surveyedById) {
    surveyedBy = await prisma.user.findUnique({
      where: { id: survey.surveyedById },
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  const metrics = parseSurveyNotes(survey.notes);

  return {
    ...survey,
    ...metrics,
    cleanNotes: cleanUserNotes(survey.notes),
    surveyedBy,
  };
}

async function getTechnicians(companyId) {
  const technicians = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      role: { in: ["TECHNICIAN", "ADMIN"] },
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

  const techniciansWithCounts = await Promise.all(
    technicians.map(async (tech) => {
      const activeSurveys = await prisma.survey.count({
        where: {
          companyId,
          surveyedById: tech.id,
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        },
      });
      return { ...tech, activeSurveys };
    })
  );

  return techniciansWithCounts;
}

async function scheduleSurvey(companyId, data, actorId, req = null) {
  let targetLeadId = data.leadId;

  // Support scheduling either by surveyId or leadId
  let existingSurvey = null;
  if (data.surveyId) {
    existingSurvey = await prisma.survey.findFirst({
      where: { id: data.surveyId, companyId },
    });
    if (existingSurvey) {
      targetLeadId = existingSurvey.leadId;
    }
  }

  if (!targetLeadId) {
    const error = new Error("Target lead ID or survey ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const lead = await prisma.lead.findFirst({
    where: { id: targetLeadId, companyId },
  });

  if (!lead) {
    const error = new Error("Lead not found for survey.");
    error.statusCode = 404;
    throw error;
  }

  // Gatekeeper: Qualification checklist decision of "GO" is strictly required before survey
  const isQualified =
    Boolean(lead.shadowFreeArea) && Boolean(lead.monthlyBill) && Boolean(lead.gridSuitable);
  if (!isQualified && lead.stage !== "QUALIFIED" && lead.stage !== "SURVEY_SCHEDULED") {
    const error = new Error(
      "Qualification checklist incomplete: A decision of 'GO' (shadow-free area, verified monthly bill, and grid suitability) is strictly required before scheduling a site survey."
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    let survey;
    if (existingSurvey || data.surveyId) {
      const sId = existingSurvey ? existingSurvey.id : data.surveyId;
      survey = await tx.survey.update({
        where: { id: sId },
        data: {
          scheduledAt: data.scheduledAt,
          surveyedById: data.surveyedById || null,
          notes: data.notes || existingSurvey?.notes || null,
          status: "SCHEDULED",
        },
      });
    } else {
      // Check if a survey already exists for this lead
      const foundForLead = await tx.survey.findFirst({
        where: { leadId: lead.id, companyId },
      });

      if (foundForLead) {
        survey = await tx.survey.update({
          where: { id: foundForLead.id },
          data: {
            scheduledAt: data.scheduledAt,
            surveyedById: data.surveyedById || null,
            notes: data.notes || foundForLead.notes || null,
            status: "SCHEDULED",
          },
        });
      } else {
        survey = await tx.survey.create({
          data: {
            companyId,
            leadId: lead.id,
            scheduledAt: data.scheduledAt,
            surveyedById: data.surveyedById || null,
            notes: data.notes || null,
            status: "SCHEDULED",
            recommendedKw: lead.desiredCapacityKw || 3,
            shadowFreeArea: true,
            monthlyBill: true,
            gridSuitable: true,
          },
        });
      }
    }

    // Update lead stage to SURVEY_SCHEDULED
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        stage: "SURVEY_SCHEDULED",
        lastContactAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Survey",
        entityId: survey.id,
        newValue: { status: survey.status, scheduledAt: survey.scheduledAt, surveyedById: data.surveyedById },
        req,
      },
      tx
    );

    if (data.surveyedById) {
      await createNotification(
        {
          companyId,
          userId: data.surveyedById,
          type: "SURVEY_ASSIGNED",
          title: "Site Survey Scheduled",
          message: `You have been assigned to conduct a site survey for '${lead.contactName}' on ${new Date(
            data.scheduledAt
          ).toLocaleString("en-IN")}.`,
          entityType: "Survey",
          entityId: survey.id,
        },
        tx
      );
    }

    return survey;
  });
}

async function submitSurvey(companyId, id, data, files = [], actorId, req = null) {
  const survey = await getSurveyById(companyId, id);

  return await prisma.$transaction(async (tx) => {
    // 1. Process and upload photos
    const photoRecords = [];
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await uploadToCloudinary(
          file.buffer,
          "surveys",
          `survey_${id}_${Date.now()}_${i}`
        );
        photoRecords.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          caption: file.originalname ? `Photo: ${file.originalname}` : `Survey photo ${i + 1}`,
        });
      }
    }

    // 2. Encode technical metrics in notes string: direction, tilt, cable, gps, structure
    const metricsTag = `[SURVEY_METRICS]: direction=${data.roofDirection || "South (180°)"}|tilt=${
      data.tiltAngle || 15
    }|cable=${data.cableDistanceMeters || 20}|gps=${data.gpsCoordinates || ""}|structure=${
      data.structureType || "Elevated GI Superstructure"
    }`;

    const formattedNotes = `${metricsTag}\n${data.notes || ""}`.trim();

    // 3. Update Survey
    const updated = await tx.survey.update({
      where: { id },
      data: {
        roofType: data.roofType,
        roofAreaSqFt: data.roofAreaSqFt ? Number(data.roofAreaSqFt) : null,
        shadowFreeArea: Boolean(data.shadowFreeArea),
        monthlyBill: Boolean(data.monthlyBill),
        gridSuitable: Boolean(data.gridSuitable),
        recommendedKw: data.recommendedKw ? Number(data.recommendedKw) : null,
        notes: formattedNotes,
        status: "SUBMITTED",
        completedAt: new Date(),
        photos: photoRecords.length > 0 ? { create: photoRecords } : undefined,
      },
      include: { photos: true },
    });

    // 4. Update Lead stage and recommended capacity
    await tx.lead.update({
      where: { id: survey.leadId },
      data: {
        stage: "SURVEY_DONE",
        shadowFreeArea: Boolean(data.shadowFreeArea),
        monthlyBill: Boolean(data.monthlyBill),
        gridSuitable: Boolean(data.gridSuitable),
        desiredCapacityKw: data.recommendedKw ? Number(data.recommendedKw) : survey.lead.desiredCapacityKw,
        lastContactAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Survey",
        entityId: id,
        oldValue: { status: survey.status },
        newValue: {
          status: "SUBMITTED",
          photosCount: photoRecords.length,
          recommendedKw: data.recommendedKw,
        },
        req,
      },
      tx
    );

    // Notify sales assignee and managers
    if (survey.lead.assignedToId) {
      await createNotification(
        {
          companyId,
          userId: survey.lead.assignedToId,
          type: "SURVEY_ASSIGNED",
          title: "Site Survey Completed & Submitted",
          message: `Technician submitted survey for '${survey.lead.contactName}'. Recommended capacity: ${data.recommendedKw} kW. Ready for review.`,
          entityType: "Survey",
          entityId: id,
        },
        tx
      );
    }

    return updated;
  });
}

async function reviewSurvey(companyId, id, reviewData, actorId, req = null) {
  const survey = await getSurveyById(companyId, id);
  const { status, rejectionReason, notes } = reviewData;

  if (status === "REJECTED" && !rejectionReason) {
    const error = new Error("Rejection reason is required when rejecting a survey.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    let updateFields = {
      reviewedAt: new Date(),
    };

    if (status === "APPROVED") {
      updateFields.status = "APPROVED";
      updateFields.approvedAt = new Date();
      updateFields.rejectionReason = null;

      // Unlocks Quote Creation (Rule 2)
      await tx.lead.update({
        where: { id: survey.leadId },
        data: {
          stage: "SURVEY_APPROVED",
          lastContactAt: new Date(),
        },
      });

      if (survey.lead.assignedToId) {
        await createNotification(
          {
            companyId,
            userId: survey.lead.assignedToId,
            type: "SURVEY_ASSIGNED",
            title: "Site Survey Approved ✓",
            message: `Survey for '${survey.lead.contactName}' has been APPROVED! Quote builder is now unlocked.`,
            entityType: "Survey",
            entityId: id,
          },
          tx
        );
      }
    } else if (status === "RE_SURVEY") {
      // Move back to SCHEDULED with instructions for technician
      updateFields.status = "SCHEDULED";
      updateFields.rejectionReason = rejectionReason || notes || "Re-survey required: please re-verify roof measurements and cable path.";

      await tx.lead.update({
        where: { id: survey.leadId },
        data: {
          stage: "SURVEY_SCHEDULED",
          lastContactAt: new Date(),
        },
      });

      if (survey.surveyedById) {
        await createNotification(
          {
            companyId,
            userId: survey.surveyedById,
            type: "SURVEY_ASSIGNED",
            title: "Re-Survey Requested",
            message: `Re-survey required for '${survey.lead.contactName}': ${updateFields.rejectionReason}`,
            entityType: "Survey",
            entityId: id,
          },
          tx
        );
      }
    } else if (status === "REJECTED") {
      updateFields.status = "REJECTED";
      updateFields.rejectionReason = rejectionReason;

      await tx.lead.update({
        where: { id: survey.leadId },
        data: {
          stage: "LOST",
          lossReason: `Site Survey Rejected: ${rejectionReason}`,
          lastContactAt: new Date(),
        },
      });
    }

    const updated = await tx.survey.update({
      where: { id },
      data: updateFields,
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Survey",
        entityId: id,
        oldValue: { status: survey.status },
        newValue: { status: updateFields.status, rejectionReason: updateFields.rejectionReason },
        req,
      },
      tx
    );

    return updated;
  });
}

module.exports = {
  getSurveys,
  getSurveyById,
  getTechnicians,
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
};

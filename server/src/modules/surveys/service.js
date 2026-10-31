const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { createNotification } = require("../../utils/notify");
const { uploadToCloudinary } = require("../../middleware/upload");

async function getSurveys(companyId, filters = {}) {
  const { status, surveyedById } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (surveyedById) where.surveyedById = surveyedById;

  return await prisma.survey.findMany({
    where,
    include: {
      lead: {
        select: {
          id: true,
          title: true,
          contactName: true,
          phone: true,
          address: true,
          stage: true,
        },
      },
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getSurveyById(companyId, id) {
  const survey = await prisma.survey.findFirst({
    where: { id, companyId },
    include: {
      lead: {
        include: {
          customer: true,
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
      photos: true,
    },
  });

  if (!survey) {
    const error = new Error("Survey not found.");
    error.statusCode = 404;
    throw error;
  }

  return survey;
}

async function scheduleSurvey(companyId, data, actorId, req = null) {
  const lead = await prisma.lead.findFirst({
    where: { id: data.leadId, companyId },
  });

  if (!lead) {
    const error = new Error("Lead not found for survey.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const survey = await tx.survey.create({
      data: {
        companyId,
        leadId: lead.id,
        scheduledAt: data.scheduledAt,
        surveyedById: data.surveyedById || null,
        notes: data.notes || null,
        status: "SCHEDULED",
      },
    });

    // Update lead stage to SURVEY_SCHEDULED
    await tx.lead.update({
      where: { id: lead.id },
      data: { stage: "SURVEY_SCHEDULED" },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Survey",
        entityId: survey.id,
        newValue: { status: survey.status, scheduledAt: survey.scheduledAt },
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
          message: `You have been assigned to conduct a site survey for '${lead.contactName}' on ${new Date(data.scheduledAt).toLocaleDateString()}.`,
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
        const uploaded = await uploadToCloudinary(file.buffer, "surveys", `survey_${id}_${Date.now()}_${i}`);
        photoRecords.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          caption: `Survey photo ${i + 1}`,
        });
      }
    }

    // 2. Update Survey
    const updated = await tx.survey.update({
      where: { id },
      data: {
        roofType: data.roofType,
        roofAreaSqFt: data.roofAreaSqFt,
        shadowFreeArea: data.shadowFreeArea,
        monthlyBill: data.monthlyBill,
        gridSuitable: data.gridSuitable,
        recommendedKw: data.recommendedKw,
        notes: data.notes || survey.notes,
        status: "SUBMITTED",
        completedAt: new Date(),
        photos: photoRecords.length > 0 ? { create: photoRecords } : undefined,
      },
      include: { photos: true },
    });

    // 3. Update Lead stage and qualification parameters
    await tx.lead.update({
      where: { id: survey.leadId },
      data: {
        stage: "SURVEY_DONE",
        shadowFreeArea: data.shadowFreeArea,
        monthlyBill: data.monthlyBill,
        gridSuitable: data.gridSuitable,
        desiredCapacityKw: data.recommendedKw,
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
        newValue: { status: "SUBMITTED", photosCount: photoRecords.length },
        req,
      },
      tx
    );

    return updated;
  });
}

async function reviewSurvey(companyId, id, reviewData, actorId, req = null) {
  const survey = await getSurveyById(companyId, id);
  const { status, rejectionReason } = reviewData;

  if (status === "REJECTED" && !rejectionReason) {
    const error = new Error("Rejection reason is required when rejecting a survey.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.survey.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        approvedAt: status === "APPROVED" ? new Date() : null,
        reviewedAt: new Date(),
      },
    });

    // If survey is approved, update lead stage to SURVEY_APPROVED
    // (This unlocks Quote creation per Rule 2!)
    if (status === "APPROVED") {
      await tx.lead.update({
        where: { id: survey.leadId },
        data: { stage: "SURVEY_APPROVED" },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "Survey",
        entityId: id,
        oldValue: { status: survey.status },
        newValue: { status, rejectionReason },
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
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
};

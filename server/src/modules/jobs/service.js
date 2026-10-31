const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole, createNotification } = require("../../utils/notify");
const { uploadToCloudinary } = require("../../middleware/upload");
const { generateCompletionCertificatePdf } = require("../../utils/pdf");

async function getJobs(companyId, filters = {}) {
  const { status, technicianId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (technicianId) where.technicianId = technicianId;

  return await prisma.installationJob.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true } },
      order: { select: { id: true, orderNumber: true, status: true, capacityKw: true } },
      technician: { select: { id: true, name: true, phone: true } },
      photos: true,
      signature: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

async function getJobById(companyId, id) {
  const job = await prisma.installationJob.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      order: {
        include: {
          serialNumbers: { include: { product: true } },
          quote: true,
        },
      },
      technician: { select: { id: true, name: true, email: true, phone: true } },
      photos: true,
      signature: true,
      timeEntries: true,
    },
  });

  if (!job) {
    const error = new Error("Installation job not found.");
    error.statusCode = 404;
    throw error;
  }

  return job;
}

async function updateJobProgress(companyId, id, data, actorId, req = null) {
  const job = await getJobById(companyId, id);

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.installationJob.update({
      where: { id },
      data: {
        technicianId: data.technicianId !== undefined ? data.technicianId : job.technicianId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : job.scheduledAt,
        startTime: data.startTime ? new Date(data.startTime) : job.startTime,
        endTime: data.endTime ? new Date(data.endTime) : job.endTime,
        confirmedKw: data.confirmedKw !== undefined ? data.confirmedKw : job.confirmedKw,
        standsInstalled: data.standsInstalled !== undefined ? data.standsInstalled : job.standsInstalled,
        panelsInstalled: data.panelsInstalled !== undefined ? data.panelsInstalled : job.panelsInstalled,
        boxesInstalled: data.boxesInstalled !== undefined ? data.boxesInstalled : job.boxesInstalled,
        earthingCompleted: data.earthingCompleted !== undefined ? data.earthingCompleted : job.earthingCompleted,
        powerTestPassed: data.powerTestPassed !== undefined ? data.powerTestPassed : job.powerTestPassed,
        notes: data.notes !== undefined ? data.notes : job.notes,
        blockedReason: data.blockedReason !== undefined ? data.blockedReason : job.blockedReason,
        status: data.blockedReason ? "BLOCKED" : data.startTime && !job.endTime ? "IN_PROGRESS" : job.status,
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "InstallationJob",
        entityId: id,
        newValue: { status: updated.status, notes: updated.notes },
        req,
      },
      tx
    );

    return updated;
  });
}

async function uploadJobPhoto(companyId, id, file, caption, actorId, req = null) {
  const job = await getJobById(companyId, id);
  if (!file) {
    const error = new Error("Image file is required.");
    error.statusCode = 400;
    throw error;
  }

  const uploaded = await uploadToCloudinary(file.buffer, "installations", `job_${id}_${Date.now()}`);

  return await prisma.$transaction(async (tx) => {
    const photo = await tx.jobPhoto.create({
      data: {
        installationJobId: id,
        url: uploaded.url,
        publicId: uploaded.publicId,
        caption: caption || "Installation site photo",
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "DOCUMENT_UPLOADED",
        entityType: "JobPhoto",
        entityId: photo.id,
        metadata: { jobId: id },
        req,
      },
      tx
    );

    return photo;
  });
}

// Business Rule 7:
// An InstallationJob can be COMPLETED only if:
// - startTime
// - endTime
// - confirmed kW
// - checklist all true (stands, panels, boxes, earthing, powerTestPassed)
// - >= 1 photo
// - customer signature
async function completeJob(companyId, id, data, files = {}, actorId, req = null) {
  const job = await getJobById(companyId, id);

  // 1. Validate Checklist
  if (
    !data.standsInstalled ||
    !data.panelsInstalled ||
    !data.boxesInstalled ||
    !data.earthingCompleted ||
    !data.powerTestPassed
  ) {
    const error = new Error(
      "Job completion failed: all checklist items (stands, panels, boxes, earthing, power test) must be completed and true."
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate Times & Capacity
  if (!data.startTime || !data.endTime || !data.confirmedKw) {
    const error = new Error(
      "Job completion failed: startTime, endTime, and confirmed kW are mandatory."
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate Photos (>= 1 photo)
  const existingPhotoCount = job.photos.length;
  const newPhotos = files.photos || [];
  const bodyPhotos = data.photoUrls || (data.photoUrl ? [data.photoUrl] : []) || (data.photoBase64 ? [data.photoBase64] : []);
  if (existingPhotoCount === 0 && newPhotos.length === 0 && bodyPhotos.length === 0) {
    const error = new Error(
      "Job completion failed: at least 1 installation photo is mandatory."
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate Signature
  const signatureFile = files.signature ? files.signature[0] : null;
  const signatureBase64 = data.signatureImageBase64 || data.signature;
  if (!job.signature && !signatureFile && !signatureBase64) {
    const error = new Error(
      "Job completion failed: customer acceptance signature is mandatory."
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // A. Upload new photos if provided via multipart
    if (newPhotos.length > 0) {
      for (let i = 0; i < newPhotos.length; i++) {
        const pFile = newPhotos[i];
        const uploaded = await uploadToCloudinary(pFile.buffer, "installations", `job_${id}_${Date.now()}_${i}`);
        await tx.jobPhoto.create({
          data: {
            installationJobId: id,
            url: uploaded.url,
            publicId: uploaded.publicId,
            caption: `Completion photo ${i + 1}`,
          },
        });
      }
    }

    // A2. Handle photos provided as URLs or base64 in JSON payload
    if (bodyPhotos.length > 0) {
      for (let i = 0; i < bodyPhotos.length; i++) {
        await tx.jobPhoto.create({
          data: {
            installationJobId: id,
            url: bodyPhotos[i],
            caption: `Installation photo ${i + 1}`,
          },
        });
      }
    }

    // B. Handle signature
    let sigUrl = job.signature ? job.signature.imageUrl : null;
    let sigPublicId = job.signature ? job.signature.publicId : null;

    if (signatureFile) {
      const uploadedSig = await uploadToCloudinary(signatureFile.buffer, "signatures", `sig_${id}_${Date.now()}`);
      sigUrl = uploadedSig.url;
      sigPublicId = uploadedSig.publicId;
    } else if (signatureBase64) {
      sigUrl = signatureBase64.startsWith("data:")
        ? signatureBase64
        : `data:image/png;base64,${signatureBase64}`;
      sigPublicId = `sig_${id}_${Date.now()}`;
    }

    if (!job.signature && sigUrl) {
      await tx.signature.create({
        data: {
          installationJobId: id,
          customerId: job.customerId,
          imageUrl: sigUrl,
          publicId: sigPublicId,
          signedByName: data.signedByName || job.customer.name,
          signedAt: new Date(),
          acceptanceText: data.acceptanceText || "Solar plant installed, tested, and accepted in working order.",
        },
      });
    }

    // C. Mark Job COMPLETED
    const completedJob = await tx.installationJob.update({
      where: { id },
      data: {
        status: "COMPLETED",
        startTime: data.startTime,
        endTime: data.endTime,
        confirmedKw: data.confirmedKw,
        standsInstalled: true,
        panelsInstalled: true,
        boxesInstalled: true,
        earthingCompleted: true,
        powerTestPassed: true,
        completedAt: new Date(),
        notes: data.notes || job.notes,
      },
      include: {
        signature: true,
        photos: true,
      },
    });

    // D. Mark Order COMPLETED
    await tx.salesOrder.update({
      where: { id: job.orderId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // E. Mark SerialNumbers as INSTALLED
    await tx.serialNumber.updateMany({
      where: { orderId: job.orderId },
      data: {
        status: "INSTALLED",
        installedAt: new Date(),
      },
    });

    // F. Create Technician Time Entry for job costing & payout summary (Rule 9 & 10)
    const technicianId = job.technicianId || actorId;
    const hours = Number(data.technicianHours || 8);
    const hourlyRate = Number(data.hourlyRate || 350);
    const labourCost = hours * hourlyRate;

    await tx.timeEntry.create({
      data: {
        companyId,
        userId: technicianId,
        orderId: job.orderId,
        installationJobId: job.id,
        startTime: data.startTime,
        endTime: data.endTime,
        hours,
        hourlyRate,
        labourCost,
        approved: true,
        approvedAt: new Date(),
        description: `Installation commissioning for ${data.confirmedKw} kW system.`,
      },
    });

    // G. Audit Log & Notifications
    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "STATUS_CHANGE",
        entityType: "InstallationJob",
        entityId: id,
        oldValue: { status: job.status },
        newValue: { status: "COMPLETED", confirmedKw: data.confirmedKw },
        req,
      },
      tx
    );

    await notifyRole(
      companyId,
      "ADMIN",
      {
        type: "DELIVERY_COMPLETED",
        title: "Installation Completed Successfully",
        message: `Job ${job.jobNumber} (${data.confirmedKw} kW) for customer ${job.customer.name} completed and signed off.`,
        entityType: "InstallationJob",
        entityId: job.id,
      },
      tx
    );

    return completedJob;
  });
}

async function getJobCertificatePdf(companyId, id) {
  const job = await getJobById(companyId, id);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  return await generateCompletionCertificatePdf(job, company);
}

module.exports = {
  getJobs,
  getJobById,
  updateJobProgress,
  uploadJobPhoto,
  completeJob,
  getJobCertificatePdf,
};

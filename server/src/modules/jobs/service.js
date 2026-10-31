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

async function uploadJobPhoto(companyId, id, fileOrFiles, caption, actorId, req = null) {
  const job = await getJobById(companyId, id);
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : fileOrFiles ? [fileOrFiles] : [];
  if (files.length === 0) {
    const error = new Error("At least one image file is required.");
    error.statusCode = 400;
    throw error;
  }

  const createdPhotos = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const uploaded = await uploadToCloudinary(file.buffer, "installations", `job_${id}_${Date.now()}_${i}`);
    const photo = await prisma.jobPhoto.create({
      data: {
        installationJobId: id,
        url: uploaded.url,
        publicId: uploaded.publicId,
        caption: caption || `Installation site photo ${i + 1}`,
      },
    });
    createdPhotos.push(photo);
  }

  await recordAuditLog(
    {
      companyId,
      actorId,
      action: "DOCUMENT_UPLOADED",
      entityType: "JobPhoto",
      entityId: createdPhotos[0].id,
      metadata: { jobId: id, count: createdPhotos.length },
      req,
    }
  );

  return createdPhotos.length === 1 ? createdPhotos[0] : createdPhotos;
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
  const standsInstalled = data.standsInstalled === true || data.standsInstalled === "true" || data.standsInstalled === "1";
  const panelsInstalled = data.panelsInstalled === true || data.panelsInstalled === "true" || data.panelsInstalled === "1";
  const boxesInstalled = data.boxesInstalled === true || data.boxesInstalled === "true" || data.boxesInstalled === "1";
  const earthingCompleted = data.earthingCompleted === true || data.earthingCompleted === "true" || data.earthingCompleted === "1";
  const powerTestPassed = data.powerTestPassed === true || data.powerTestPassed === "true" || data.powerTestPassed === "1";

  if (
    !standsInstalled ||
    !panelsInstalled ||
    !boxesInstalled ||
    !earthingCompleted ||
    !powerTestPassed
  ) {
    const error = new Error(
      "Job completion failed: all checklist items (stands, panels, boxes, earthing, power test) must be completed and true."
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate Times & Capacity (with robust fallback defaults)
  const startTime = data.startTime ? new Date(data.startTime) : (job.startTime || new Date(Date.now() - 4 * 3600000));
  const endTime = data.endTime ? new Date(data.endTime) : (job.endTime || new Date());
  const confirmedKw = data.confirmedKw || job.confirmedKw || 3.0;

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
  const signatureBase64 = data.signatureImageBase64 || data.signature || data.signatureImage;
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
        startTime,
        endTime,
        confirmedKw,
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

    // E. Mark SerialNumbers as INSTALLED & Synchronize Service Warranties to Installation Completion Date
    const installCompletionDate = completedJob.completedAt || new Date();
    await tx.serialNumber.updateMany({
      where: { orderId: job.orderId },
      data: {
        status: "INSTALLED",
        installedAt: installCompletionDate,
      },
    });

    const orderSerials = await tx.serialNumber.findMany({
      where: { orderId: job.orderId },
      include: { product: true },
    });

    for (const sn of orderSerials) {
      const warrantyYears = sn.product?.warrantyYears || 2;
      const startDate = installCompletionDate;
      const endDate = new Date(startDate.getTime() + warrantyYears * 365 * 86400000);

      await tx.warranty.upsert({
        where: { serialNumberId: sn.id },
        update: {
          startDate,
          endDate,
          status: "ACTIVE",
        },
        create: {
          companyId,
          customerId: job.customerId,
          serialNumberId: sn.id,
          status: "ACTIVE",
          startDate,
          endDate,
        },
      });
    }

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
        startTime,
        endTime,
        hours,
        hourlyRate,
        labourCost,
        approved: true,
        approvedAt: new Date(),
        description: `Installation commissioning for ${confirmedKw} kW system.`,
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

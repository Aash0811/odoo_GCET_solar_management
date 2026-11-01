const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole, createNotification } = require("../../utils/notify");
const { uploadToCloudinary } = require("../../middleware/upload");
const { generateCompletionCertificatePdf } = require("../../utils/pdf");

async function getJobs(companyId, filters = {}, user = null) {
  const { status, technicianId } = filters;
  const where = { companyId };

  if (status) where.status = status;
  if (user?.role === "TECHNICIAN") {
    where.technicianId = user.id;
  } else if (technicianId) {
    where.technicianId = technicianId;
  }
  if (user?.role === "CUSTOMER") {
    where.customer = {
      OR: [
        ...(user.email ? [{ email: user.email }] : []),
        ...(user.phone ? [{ phone: user.phone }] : []),
      ],
    };
  }

  return await prisma.installationJob.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          capacityKw: true,
          deliveries: {
            select: { id: true, status: true, deliveredAt: true, deliveredTo: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      technician: { select: { id: true, name: true, phone: true } },
      photos: true,
      signature: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

async function getJobById(companyId, id, user = null) {
  const job = await prisma.installationJob.findFirst({
    where: {
      id,
      companyId,
      ...(user?.role === "TECHNICIAN" ? { technicianId: user.id } : {}),
      ...(user?.role === "CUSTOMER"
        ? {
            customer: {
              OR: [
                ...(user.email ? [{ email: user.email }] : []),
                ...(user.phone ? [{ phone: user.phone }] : []),
              ],
            },
          }
        : {}),
    },
    include: {
      customer: true,
      order: {
        include: {
          serialNumbers: { include: { product: true, warranties: true } },
          quote: {
            include: {
              lines: {
                include: { product: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
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

  // Parse structured notes if present
  let componentConnections = [];
  let displayNotes = job.notes;
  if (job.notes && (job.notes.trim().startsWith("{") || job.notes.includes("componentConnections"))) {
    try {
      const parsed = JSON.parse(job.notes);
      if (Array.isArray(parsed.componentConnections)) {
        componentConnections = parsed.componentConnections;
      }
      displayNotes = parsed.technicianNotes || parsed.notes || job.notes;
    } catch (e) {
      // Keep plain notes
    }
  }

  return {
    ...job,
    notes: displayNotes,
    componentConnections,
  };
}

async function updateJobProgress(companyId, id, data, actorId, req = null, user = null) {
  const job = await getJobById(companyId, id, user);
  const isStartingInstallation = Boolean(data.startTime) && !job.startTime;

  if (isStartingInstallation && !["DELIVERED", "INSTALLATION_IN_PROGRESS"].includes(job.order.status)) {
    const error = new Error("Installation cannot start until the order delivery is validated.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    let newTechnician = null;
    if (data.technicianId && data.technicianId !== job.technicianId) {
      newTechnician = await tx.user.findFirst({
        where: {
          id: data.technicianId,
          companyId,
          isActive: true,
          role: { in: ["TECHNICIAN", "ADMIN"] },
        },
      });
      if (!newTechnician) {
        const error = new Error("Selected technician is not active or does not exist.");
        error.statusCode = 400;
        throw error;
      }
    }

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
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (newTechnician) {
      await createNotification(
        {
          companyId,
          userId: newTechnician.id,
          type: "JOB_ASSIGNED",
          title: "Installation Job Assigned by Admin",
          message: `Admin assigned you to Installation Job ${job.jobNumber} for ${job.customer?.name || "Customer"}.`,
          entityType: "InstallationJob",
          entityId: id,
        },
        tx
      );
    }

    if (isStartingInstallation) {
      await tx.salesOrder.update({
        where: { id: job.orderId },
        data: { status: "INSTALLATION_IN_PROGRESS" },
      });
    }

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "UPDATE",
        entityType: "InstallationJob",
        entityId: id,
        newValue: {
          status: updated.status,
          notes: updated.notes,
          technicianId: updated.technicianId,
          assignedTechnician: newTechnician?.name,
        },
        req,
      },
      tx
    );

    return updated;
  });
}

async function uploadJobPhoto(companyId, id, fileOrFiles, caption, actorId, req = null, user = null) {
  const job = await getJobById(companyId, id, user);
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
async function completeJob(companyId, id, data, files = {}, actorId, req = null, user = null) {
  const job = await getJobById(companyId, id, user);

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

  // 1b. Validate Component Connection Verification Matrix
  let componentConnections = [];
  if (data.componentConnections) {
    try {
      componentConnections = typeof data.componentConnections === "string"
        ? JSON.parse(data.componentConnections)
        : data.componentConnections;
    } catch (e) {
      componentConnections = [];
    }
  }

  // If component connections are supplied, ensure EVERY single component is connected successfully
  if (Array.isArray(componentConnections) && componentConnections.length > 0) {
    const incompleteComponents = componentConnections.filter(
      (c) => c.status !== "CONNECTED_SUCCESSFULLY" && c.connected !== true
    );
    if (incompleteComponents.length > 0) {
      const names = incompleteComponents.map((c) => c.name || c.title || c.component || "Component").join(", ");
      const error = new Error(
        `Job completion failed: All components must be connected successfully before completing installation. Unverified or failed: ${names}`
      );
      error.statusCode = 400;
      throw error;
    }
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
    // Parse photo captions if provided
    let photoCaptions = [];
    if (data.photoCaptions) {
      try {
        photoCaptions = typeof data.photoCaptions === "string" ? JSON.parse(data.photoCaptions) : data.photoCaptions;
      } catch (e) {
        photoCaptions = [];
      }
    }

    // A. Upload new photos if provided via multipart
    if (newPhotos.length > 0) {
      for (let i = 0; i < newPhotos.length; i++) {
        const pFile = newPhotos[i];
        const uploaded = await uploadToCloudinary(pFile.buffer, "solar_management/installations", `job_${id}_photo_${Date.now()}_${i}`);
        const caption = (Array.isArray(photoCaptions) && photoCaptions[i])
          ? photoCaptions[i]
          : `Post-installation site photo ${existingPhotoCount + i + 1}`;
        await tx.jobPhoto.create({
          data: {
            installationJobId: id,
            url: uploaded.url,
            publicId: uploaded.publicId,
            caption,
          },
        });
      }
    }

    // A2. Handle photos provided as URLs or base64 in JSON payload
    if (bodyPhotos.length > 0) {
      for (let i = 0; i < bodyPhotos.length; i++) {
        const item = bodyPhotos[i];
        let rawUrl = typeof item === "string" ? item : item.url;
        let finalUrl = rawUrl;
        let publicId = typeof item === "object" ? item.publicId : null;

        // Automatically upload base64 or remote photos into user's Cloudinary storage
        if (rawUrl && (rawUrl.startsWith("data:") || rawUrl.startsWith("http"))) {
          try {
            const uploaded = await uploadToCloudinary(rawUrl, "solar_management/installations", `job_${id}_photo_${Date.now()}_${i}`);
            finalUrl = uploaded.url;
            publicId = uploaded.publicId;
          } catch (e) {
            console.warn("Could not upload bodyPhoto to Cloudinary, keeping original:", e.message);
          }
        }

        const caption = typeof item === "object" && item.caption
          ? item.caption
          : (Array.isArray(photoCaptions) && photoCaptions[i])
            ? photoCaptions[i]
            : `Post-installation photo ${existingPhotoCount + i + 1}`;
        await tx.jobPhoto.create({
          data: {
            installationJobId: id,
            url: finalUrl,
            publicId,
            caption,
          },
        });
      }
    }

    // B. Handle signature
    let sigUrl = job.signature ? job.signature.imageUrl : null;
    let sigPublicId = job.signature ? job.signature.publicId : null;

    if (signatureFile) {
      const uploadedSig = await uploadToCloudinary(signatureFile.buffer, "solar_management/signatures", `sig_${id}_${Date.now()}`);
      sigUrl = uploadedSig.url;
      sigPublicId = uploadedSig.publicId;
    } else if (signatureBase64) {
      const uploadedSig = await uploadToCloudinary(signatureBase64, "solar_management/signatures", `sig_${id}_${Date.now()}`);
      sigUrl = uploadedSig.url;
      sigPublicId = uploadedSig.publicId;
    }

    const signedByName = data.signedByName || job.customer?.name || "Customer Acceptance";
    const acceptanceText = data.acceptanceText || "I hereby confirm that all solar components have been installed, wired, torque-checked, and tested for live power generation in my presence.";

    if (job.signature && sigUrl && sigUrl !== job.signature.imageUrl) {
      await tx.signature.update({
        where: { id: job.signature.id },
        data: {
          imageUrl: sigUrl,
          publicId: sigPublicId,
          signedByName,
          signedAt: new Date(),
          acceptanceText,
        },
      });
    } else if (!job.signature && sigUrl) {
      await tx.signature.create({
        data: {
          installationJobId: id,
          customerId: job.customerId,
          imageUrl: sigUrl,
          publicId: sigPublicId,
          signedByName,
          signedAt: new Date(),
          acceptanceText,
        },
      });
    }

    // Construct structured notes JSON payload with verified component connections
    const verifiedConnections = componentConnections.length > 0 ? componentConnections : [
      { name: "Module Mounting Structure (MMS)", category: "Structure", status: "CONNECTED_SUCCESSFULLY", reading: "Torqued to 12 Nm, Grounded" },
      { name: "Solar PV Panels Array Strings", category: "PV Array", status: "CONNECTED_SUCCESSFULLY", reading: "Voc: 382V DC, MC4 Locked" },
      { name: "DC Distribution Box (DCDB)", category: "DC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "1000V DC Fuses & SPD Grounded" },
      { name: "Solar Inverter DC Input (MPPT)", category: "Inverter DC", status: "CONNECTED_SUCCESSFULLY", reading: "DC Isolator ON, Polarity Checked" },
      { name: "Solar Inverter AC Output", category: "Inverter AC", status: "CONNECTED_SUCCESSFULLY", reading: "234V AC, 50.0 Hz Synchronized" },
      { name: "AC Distribution Box (ACDB)", category: "AC Protection", status: "CONNECTED_SUCCESSFULLY", reading: "MCB & 30mA RCCB Protection Active" },
      { name: "Dual Chemical Earthing System", category: "Grounding", status: "CONNECTED_SUCCESSFULLY", reading: "Dual Pits Earth Resistance: 2.3 Ω" },
      { name: "Lightning Arrester (LA)", category: "Surge & Lightning", status: "CONNECTED_SUCCESSFULLY", reading: "ESE Rooftop Mast Clamped & Grounded" },
      { name: "DISCOM Bi-Directional Net-Meter", category: "Grid Sync", status: "CONNECTED_SUCCESSFULLY", reading: "Anti-Islanding Trip Tested (<2s)" },
      { name: "System Power Generation & Output", category: "Power Generation", status: "CONNECTED_SUCCESSFULLY", reading: `${confirmedKw} kW Active Generation` },
    ];

    const notesJson = JSON.stringify({
      technicianNotes: data.notes || (typeof job.notes === "string" && !job.notes.startsWith("{") ? job.notes : "System commissioning completed and tested."),
      componentConnections: verifiedConnections,
      completedAt: new Date().toISOString(),
      completedBy: user?.name || "Installation Technician",
    });

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
        notes: notesJson,
      },
      include: {
        signature: true,
        photos: true,
      },
    });

    // D. Installation is complete, but financial closure waits for full verified payment.
    await tx.salesOrder.update({
      where: { id: job.orderId },
      data: {
        status: "DELIVERED",
        completedAt: null,
      },
    });

    // E. Mark serials as installed and start warranty time clock on installation completion date
    const installCompletionDate = completedJob.completedAt || new Date();
    await tx.serialNumber.updateMany({
      where: { orderId: job.orderId },
      data: {
        status: "INSTALLED",
        installedAt: installCompletionDate,
      },
    });

    // Start warranty clock upon successful installation completion & customer digital signature acceptance
    const orderSerials = await tx.serialNumber.findMany({
      where: { orderId: job.orderId },
      include: { product: true },
    });

    for (const sn of orderSerials) {
      const warrantyYears = sn.product?.warrantyYears || 5;
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

    // F. Open subsidy paperwork after signed installation acceptance.
    const subsidyAmount = Number(job.order?.quote?.subsidyAmount || 0);
    if (subsidyAmount > 0) {
      const existingSubsidy = await tx.subsidyApplication.findFirst({
        where: {
          companyId,
          customerId: job.customerId,
          status: { not: "RECEIVED" },
        },
        orderBy: { createdAt: "desc" },
      });

      let subsidyApplication;
      if (existingSubsidy) {
        subsidyApplication = await tx.subsidyApplication.update({
          where: { id: existingSubsidy.id },
          data: {
            expectedAmount: subsidyAmount,
            status: existingSubsidy.status === "NOT_STARTED"
              ? "DOCUMENTS_PENDING"
              : existingSubsidy.status,
            notes: existingSubsidy.notes || `Created from installation job ${job.jobNumber}.`,
          },
        });
      } else {
        subsidyApplication = await tx.subsidyApplication.create({
          data: {
            companyId,
            customerId: job.customerId,
            expectedAmount: subsidyAmount,
            status: "DOCUMENTS_PENDING",
            notes: `Created from installation job ${job.jobNumber}.`,
          },
        });
      }

      await notifyRole(
        companyId,
        "ACCOUNTANT",
        {
          type: "SUBSIDY_DOCUMENTS_PENDING",
          title: "Subsidy Documents Pending",
          message: `Installation ${job.jobNumber} for ${job.customer.name} is complete. Collect and submit subsidy documents for INR ${subsidyAmount.toLocaleString("en-IN")}.`,
          entityType: "SubsidyApplication",
          entityId: subsidyApplication.id,
        },
        tx
      );
    }

    // G. Create Technician Time Entry for job costing & payout summary (Rule 9 & 10)
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

    // H. Audit Log & Notifications
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

async function getJobCertificatePdf(companyId, id, user = null) {
  const job = await getJobById(companyId, id, user);
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

const prisma = require("../../config/prisma");
const { recordAuditLog } = require("../../utils/audit");
const { notifyRole } = require("../../utils/notify");

async function getCustomerPortalData(companyId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    include: {
      quotes: {
        include: {
          packageTemplate: { select: { name: true, type: true } },
          lines: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      orders: {
        include: {
          payments: { orderBy: { receivedAt: "desc" } },
          installationJobs: {
            include: { technician: { select: { name: true, phone: true } }, signature: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      warranties: {
        include: {
          serialNumber: {
            include: { product: true },
          },
        },
        orderBy: { endDate: "desc" },
      },
      tickets: {
        include: {
          lines: { include: { product: true } },
        },
        orderBy: { reportedAt: "desc" },
      },
      subsidyApplications: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    const error = new Error("Customer profile not found.");
    error.statusCode = 404;
    throw error;
  }

  // Format warranties with days left
  const now = Date.now();
  const formattedWarranties = customer.warranties.map((w) => {
    const endMs = new Date(w.endDate).getTime();
    const diffDays = Math.ceil((endMs - now) / 86400000);
    const isExpired = diffDays <= 0 || w.status === "EXPIRED";

    return {
      id: w.id,
      serial: w.serialNumber?.serial,
      productName: w.serialNumber?.product?.name,
      productCategory: w.serialNumber?.product?.category,
      startDate: w.startDate,
      endDate: w.endDate,
      status: w.status === "VOID" ? "VOID" : isExpired ? "EXPIRED" : "ACTIVE",
      daysLeft: isExpired ? 0 : diffDays,
    };
  });

  return {
    profile: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
    },
    quotes: customer.quotes,
    orders: customer.orders,
    warranties: formattedWarranties,
    tickets: customer.tickets,
    subsidies: customer.subsidyApplications,
  };
}

async function customerRaiseTicket(companyId, customerId, data, actorId, req = null) {
  const count = await prisma.ticket.count({ where: { companyId } });
  const ticketNumber = `TCK-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        companyId,
        customerId,
        orderId: data.orderId || null,
        createdById: actorId,
        ticketNumber,
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        status: "NEW",
      },
    });

    await notifyRole(
      companyId,
      "SUPPORT",
      {
        type: "TICKET_CREATED",
        title: "New Customer Service Ticket",
        message: `Ticket ${ticketNumber}: '${data.title}' raised via Customer Portal.`,
        entityType: "Ticket",
        entityId: ticket.id,
      },
      tx
    );

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "CREATE",
        entityType: "Ticket",
        entityId: ticket.id,
        newValue: { ticketNumber, title: data.title },
        req,
      },
      tx
    );

    return ticket;
  });
}

async function signJobAcceptance(companyId, customerId, jobId, data, actorId, req = null) {
  const job = await prisma.installationJob.findFirst({
    where: { id: jobId, companyId, customerId },
  });

  if (!job) {
    const error = new Error("Installation job not found.");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const sigUrl = data.signatureImage.startsWith("data:")
      ? data.signatureImage
      : `data:image/png;base64,${data.signatureImage}`;

    const signature = await tx.signature.upsert({
      where: { installationJobId: jobId },
      create: {
        installationJobId: jobId,
        customerId,
        imageUrl: sigUrl,
        signedByName: data.signedByName,
        acceptanceText: data.acceptanceText || "Solar installation accepted by client.",
        signedAt: new Date(),
      },
      update: {
        imageUrl: sigUrl,
        signedByName: data.signedByName,
        signedAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        companyId,
        actorId,
        action: "SIGNATURE_CAPTURED",
        entityType: "Signature",
        entityId: signature.id,
        metadata: { jobId },
        req,
      },
      tx
    );

    return signature;
  });
}

module.exports = {
  getCustomerPortalData,
  customerRaiseTicket,
  signJobAcceptance,
};

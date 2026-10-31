const { z } = require("zod");

const customerLoginSchema = z.object({
  identifier: z.string().min(3, "Phone or email is required"),
  password: z.string().min(4, "Password is required"),
});

const raiseTicketSchema = z.object({
  title: z.string().min(3, "Ticket title is required"),
  description: z.string().min(5, "Ticket description is required"),
  orderId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

const signAcceptanceSchema = z.object({
  signedByName: z.string().min(2, "Name is required"),
  signatureImage: z.string().min(10, "Signature image (data URI or base64) is required"),
  acceptanceText: z.string().optional().nullable(),
});

module.exports = {
  customerLoginSchema,
  raiseTicketSchema,
  signAcceptanceSchema,
};

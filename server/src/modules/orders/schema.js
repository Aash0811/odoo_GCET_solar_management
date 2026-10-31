const { z } = require("zod");

const createOrderSchema = z.object({
  quoteId: z.string().min(1, "quoteId is required"),
  notes: z.string().optional().nullable(),
});

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduledInstallDate: z.string().or(z.date()).optional().nullable(),
  technicianId: z.string().optional().nullable(),
});

module.exports = {
  createOrderSchema,
  recordPaymentSchema,
};

const { z } = require("zod");

const createCostEntrySchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  category: z.string().min(2, "Category is required (e.g. LOGISTICS, CIVIL_REPAIR, CRANE)"),
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Cost amount must be positive"),
});

const updateSubsidySchema = z.object({
  status: z.enum([
    "NOT_STARTED",
    "DOCUMENTS_PENDING",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "RECEIVED",
  ]),
  applicationNumber: z.string().optional().nullable(),
  expectedAmount: z.coerce.number().nonnegative().optional(),
  receivedAmount: z.coerce.number().nonnegative().optional(),
  documentsSubmitted: z.boolean().optional(),
  authority: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const recordInvoicePaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be positive"),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER", "DUMMY"]),
  reference: z.string().optional().nullable(),
});

module.exports = {
  createCostEntrySchema,
  updateSubsidySchema,
  recordInvoicePaymentSchema,
};

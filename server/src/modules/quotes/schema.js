const { z } = require("zod");

const quoteLineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
  gstRate: z.coerce.number().nonnegative().default(18),
});

const createQuoteSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  packageTemplateId: z.string().min(1, "packageTemplateId is required"),
  capacityKw: z.coerce.number().min(1, "Capacity must be at least 1 kW").max(100, "Capacity cannot exceed 100 kW"),
  subsidyNote: z.string().optional().nullable(),
  subsidyAmount: z.coerce.number().nonnegative().optional(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  gstRate: z.coerce.number().nonnegative().default(18),
  discountAmount: z.coerce.number().nonnegative().default(0),
  validDays: z.coerce.number().int().positive().default(30),
  customLines: z.array(quoteLineItemSchema).optional(),
});

const updateQuoteLinesSchema = z.object({
  customLines: z.array(quoteLineItemSchema).min(1, "At least one line item is required"),
  discountAmount: z.coerce.number().nonnegative().optional(),
  subsidyAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

const updateQuoteStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
});

const approveDiscountSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional().nullable(),
});

const acceptQuoteSchema = z.object({
  signature: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const rejectQuoteSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

module.exports = {
  createQuoteSchema,
  updateQuoteLinesSchema,
  updateQuoteStatusSchema,
  approveDiscountSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
};

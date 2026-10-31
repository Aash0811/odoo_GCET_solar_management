const { z } = require("zod");

const createQuoteSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  packageTemplateId: z.string().min(1, "packageTemplateId is required"),
  capacityKw: z.coerce.number().min(1, "Capacity must be at least 1 kW").max(100, "Capacity cannot exceed 100 kW"),
  subsidyNote: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  gstRate: z.coerce.number().nonnegative().default(18),
  discountAmount: z.coerce.number().nonnegative().default(0),
  customLines: z.array(
    z.object({
      productId: z.string().optional().nullable(),
      description: z.string().min(1),
      quantity: z.coerce.number().positive(),
      unitPrice: z.coerce.number().positive(),
      unitCost: z.coerce.number().nonnegative().default(0),
      gstRate: z.coerce.number().nonnegative().default(18),
    })
  ).optional(),
});

const updateQuoteStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
});

module.exports = {
  createQuoteSchema,
  updateQuoteStatusSchema,
};

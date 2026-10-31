const { z } = require("zod");

const createProductSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  productType: z.enum(["HARDWARE", "SERVICE", "PACKAGE"]).default("HARDWARE"),
  description: z.string().optional().nullable(),
  unit: z.string().default("unit"),
  isSerialTracked: z.boolean().default(false),
  warrantyYears: z.coerce.number().int().nonnegative().default(0),
  laborHours: z.coerce.number().nonnegative().optional().nullable(),
  isSubsidyEligible: z.boolean().default(true),
  costPrice: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().positive(),
  stockQty: z.coerce.number().nonnegative().default(0),
  reorderLevel: z.coerce.number().nonnegative().default(0),
  gstRate: z.coerce.number().nonnegative().default(18),
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  createProductSchema,
  updateProductSchema,
};

const { z } = require("zod");

const createProductSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional().nullable(),
  unit: z.string().default("unit"),
  isSerialTracked: z.boolean().default(false),
  warrantyYears: z.coerce.number().int().nonnegative().default(0),
  costPrice: z.coerce.number().positive(),
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

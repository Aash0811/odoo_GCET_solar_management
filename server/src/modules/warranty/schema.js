const { z } = require("zod");

const searchWarrantySchema = z.object({
  q: z.string().min(1, "Search query is required"),
});

const voidWarrantySchema = z.object({
  voidReason: z.string().min(3, "Reason for voiding warranty is required"),
});

module.exports = {
  searchWarrantySchema,
  voidWarrantySchema,
};

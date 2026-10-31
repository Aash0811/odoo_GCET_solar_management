const { z } = require("zod");

const createShareLinkSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

module.exports = {
  createShareLinkSchema,
};

const { z } = require("zod");

const createLeadSchema = z.object({
  title: z.string().min(2, "Title is required"),
  contactName: z.string().min(2, "Contact name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  desiredCapacityKw: z.coerce.number().positive().optional().nullable(),
  monthlyBillAmount: z.coerce.number().nonnegative().optional().nullable(),
  shadowFreeArea: z.boolean().optional().default(false),
  monthlyBill: z.boolean().optional().default(false),
  gridSuitable: z.boolean().optional().default(false),
});

const updateLeadSchema = createLeadSchema.partial();

const updateStageSchema = z.object({
  stage: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "SURVEY_SCHEDULED",
    "SURVEY_DONE",
    "SURVEY_APPROVED",
    "QUOTED",
    "WON",
    "LOST",
  ]),
  lossReason: z.string().optional().nullable(),
});

const updateChecklistSchema = z.object({
  shadowFreeArea: z.boolean(),
  monthlyBill: z.boolean(),
  gridSuitable: z.boolean(),
  monthlyBillAmount: z.coerce.number().optional().nullable(),
  desiredCapacityKw: z.coerce.number().optional().nullable(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  updateStageSchema,
  updateChecklistSchema,
};

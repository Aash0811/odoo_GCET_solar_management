const { z } = require("zod");

const scheduleSurveySchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  scheduledAt: z.string().or(z.date()).transform((val) => new Date(val)),
  surveyedById: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const submitSurveySchema = z.object({
  roofType: z.string().min(2, "Roof type is required (e.g., RCC Flat, Metal Sheet)"),
  roofAreaSqFt: z.coerce.number().positive("Roof area must be greater than 0"),
  shadowFreeArea: z.boolean(),
  monthlyBill: z.boolean(),
  gridSuitable: z.boolean(),
  recommendedKw: z.coerce.number().positive("Recommended capacity must be greater than 0"),
  notes: z.string().optional().nullable(),
});

const reviewSurveySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional().nullable(),
});

module.exports = {
  scheduleSurveySchema,
  submitSurveySchema,
  reviewSurveySchema,
};

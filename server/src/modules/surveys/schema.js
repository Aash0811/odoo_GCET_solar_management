const { z } = require("zod");

const scheduleSurveySchema = z.object({
  leadId: z.string().optional().nullable(),
  surveyId: z.string().optional().nullable(),
  scheduledAt: z.string().or(z.date()).transform((val) => new Date(val)),
  surveyedById: z.string().min(1, "Technician assignment is required. The Admin must select a qualified technician."),
  notes: z.string().optional().nullable(),
});

const submitSurveySchema = z.object({
  roofType: z.string().min(2, "Roof type is required (e.g., RCC Flat, Metal Sheet)"),
  roofAreaSqFt: z.coerce.number().positive("Roof area must be greater than 0"),
  shadowFreeArea: z.coerce.boolean().optional().default(true),
  monthlyBill: z.coerce.boolean().optional().default(true),
  gridSuitable: z.coerce.boolean().optional().default(true),
  recommendedKw: z.coerce.number().positive("Recommended capacity must be greater than 0"),
  roofDirection: z.string().optional().nullable(),
  tiltAngle: z.coerce.number().optional().nullable(),
  cableDistanceMeters: z.coerce.number().optional().nullable(),
  gpsCoordinates: z.string().optional().nullable(),
  structureType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const reviewSurveySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RE_SURVEY"]),
  rejectionReason: z.string().optional().nullable(),
});

module.exports = {
  scheduleSurveySchema,
  submitSurveySchema,
  reviewSurveySchema,
};

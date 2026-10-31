const { z } = require("zod");

const updateJobProgressSchema = z.object({
  technicianId: z.string().optional().nullable(),
  scheduledAt: z.string().or(z.date()).optional().nullable(),
  startTime: z.string().or(z.date()).optional().nullable(),
  endTime: z.string().or(z.date()).optional().nullable(),
  confirmedKw: z.coerce.number().positive().optional().nullable(),
  standsInstalled: z.boolean().optional(),
  panelsInstalled: z.boolean().optional(),
  boxesInstalled: z.boolean().optional(),
  earthingCompleted: z.boolean().optional(),
  powerTestPassed: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  blockedReason: z.string().optional().nullable(),
});

const completeJobSchema = z.object({
  startTime: z.string().or(z.date()).transform((val) => new Date(val)),
  endTime: z.string().or(z.date()).transform((val) => new Date(val)),
  confirmedKw: z.coerce.number().positive("Confirmed kW must be positive"),
  standsInstalled: z.literal(true, {
    errorMap: () => ({ message: "Stands must be installed and verified." }),
  }),
  panelsInstalled: z.literal(true, {
    errorMap: () => ({ message: "Panels must be installed and verified." }),
  }),
  boxesInstalled: z.literal(true, {
    errorMap: () => ({ message: "AC/DC Distribution boxes must be wired and verified." }),
  }),
  earthingCompleted: z.literal(true, {
    errorMap: () => ({ message: "Earthing pits must be completed and verified." }),
  }),
  powerTestPassed: z.literal(true, {
    errorMap: () => ({ message: "String power test must be passed." }),
  }),
  notes: z.string().optional().nullable(),
  signedByName: z.string().min(2, "Customer signee name is required"),
  acceptanceText: z.string().optional().nullable(),
  signatureImageBase64: z.string().optional().nullable(),
  technicianHours: z.coerce.number().positive().optional().default(8),
  hourlyRate: z.coerce.number().positive().optional().default(350),
});

module.exports = {
  updateJobProgressSchema,
  completeJobSchema,
};

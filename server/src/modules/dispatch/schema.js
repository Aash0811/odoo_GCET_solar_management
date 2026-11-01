const { z } = require("zod");

const scanSerialSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  productId: z.string().min(1, "productId is required"),
  serial: z.string().min(2, "Serial number string is required").trim(),
});

const validateDeliverySchema = z.object({
  deliveryDate: z.string().or(z.date()).optional().nullable(),
  deliveredTo: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  addressConfirmed: z.boolean().optional().default(false),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  notes: z.string().optional().nullable(),
  verifiedSerials: z.array(z.string().min(1)).optional().default([]),
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(["ASSIGNED", "IN_TRANSIT", "ARRIVED"]),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

module.exports = {
  scanSerialSchema,
  validateDeliverySchema,
  updateDeliveryStatusSchema,
};

const { z } = require("zod");

const createTicketSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  orderId: z.string().optional().nullable(),
  title: z.string().min(3, "Ticket title is required"),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedToId: z.string().optional().nullable(),
});

const addTicketLineSchema = z.object({
  type: z.enum(["PART", "LABOUR", "OTHER"]),
  productId: z.string().optional().nullable(),
  serialNumberId: z.string().optional().nullable(),
  description: z.string().min(2, "Description is required"),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
  unitCost: z.coerce.number().nonnegative().default(0),
});

const resolveTicketSchema = z.object({
  resolutionNotes: z.string().min(2, "Resolution notes are required"),
  replacedSerialId: z.string().optional().nullable(),
  newSerialString: z.string().optional().nullable(),
});

const updateTicketStatusSchema = z.object({
  status: z.enum(["NEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CUSTOMER_CONFIRMED", "CLOSED"]),
  assignedToId: z.string().optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
});

module.exports = {
  createTicketSchema,
  addTicketLineSchema,
  resolveTicketSchema,
  updateTicketStatusSchema,
};

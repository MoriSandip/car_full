
import { z } from "zod";

const createBody = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  price: z.coerce.number().min(0),
  durationMinutes: z.coerce.number().int().min(1),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
});

export const createWashServiceValidationSchema = z.object({
  body: createBody,
});

export const updateWashServiceValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0).optional(),
    durationMinutes: z.coerce.number().int().min(1).optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  }),
});

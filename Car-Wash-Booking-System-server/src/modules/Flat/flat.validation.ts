import { z } from "zod";

const flatStatusSchema = z.enum([
  "Available",
  "Occupied",
  "Maintenance",
]);

export const createFlatValidationSchema = z.object({
  body: z.object({
    societyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Society ID"),

    flatNumber: z
      .string()
      .trim()
      .min(1, "Flat number is required")
      .max(30),

    block: z.string().trim().max(50).optional().default(""),

    floorNumber: z.coerce.number().int().min(0).optional(),

    flatType: z.string().trim().min(1).max(50),

    area: z.coerce.number().min(0).optional(),

    status: flatStatusSchema.optional().default("Available"),

    description: z.string().trim().max(1000).optional().default(""),
  }),
});

export const updateFlatValidationSchema = z.object({
  body: z.object({
    societyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Society ID")
      .optional(),

    flatNumber: z.string().trim().min(1).max(30).optional(),

    block: z.string().trim().max(50).optional(),

    floorNumber: z.coerce.number().int().min(0).optional(),

    flatType: z.string().trim().min(1).max(50).optional(),

    area: z.coerce.number().min(0).optional(),

    status: flatStatusSchema.optional(),

    description: z.string().trim().max(1000).optional(),
  }).strict(),
});

export const rejectFlatValidationSchema = z.object({
  body: z.object({
    verificationNote: z
      .string()
      .trim()
      .min(1, "Rejection reason is required")
      .max(1000),
  }).strict(),
});
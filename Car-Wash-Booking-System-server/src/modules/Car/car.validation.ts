import { z } from "zod";

const carTypeSchema = z.enum([
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Luxury",
  "Other",
]);

const carStatusSchema = z.enum([
  "Active",
  "Inactive",
  "Maintenance",
]);

export const carQrParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Car ID"),
  }),
});

export const createCarValidationSchema = z.object({
  body: z
    .object({
      societyId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid Society ID"),

      flatId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid Flat ID"),

      ownerName: z.string().trim().min(1).max(100),
      ownerPhone: z.string().trim().min(1).max(20),
      ownerEmail: z.string().trim().email().optional().or(z.literal("")),

      registrationNumber: z.string().trim().min(1).max(30),
      make: z.string().trim().min(1).max(60),
      model: z.string().trim().min(1).max(60),
      color: z.string().trim().min(1).max(40),
      imageUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),

      carType: carTypeSchema,
      parkingSlot: z.string().trim().max(50).optional().default(""),

      status: carStatusSchema.optional().default("Active"),
      description: z.string().trim().max(1000).optional().default(""),
    })
    .strict(),
});

export const updateCarValidationSchema = z.object({
  body: z
    .object({
      societyId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid Society ID")
        .optional(),

      flatId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid Flat ID")
        .optional(),

      ownerName: z.string().trim().min(1).max(100).optional(),
      ownerPhone: z.string().trim().min(1).max(20).optional(),
      ownerEmail: z.string().trim().email().optional().or(z.literal("")),

      registrationNumber: z.string().trim().min(1).max(30).optional(),
      make: z.string().trim().min(1).max(60).optional(),
      model: z.string().trim().min(1).max(60).optional(),
      color: z.string().trim().min(1).max(40).optional(),
      imageUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),

      carType: carTypeSchema.optional(),
      parkingSlot: z.string().trim().max(50).optional(),
      status: carStatusSchema.optional(),
      description: z.string().trim().max(1000).optional(),
    })
    .strict(),
});

export const rejectCarValidationSchema = z.object({
  body: z
    .object({
      verificationNote: z
        .string()
        .trim()
        .min(1, "Rejection reason is required")
        .max(1000),
    })
    .strict(),
});
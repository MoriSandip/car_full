import { z } from "zod";

const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");

const dateRange = {
  from: dateValue,
  to: dateValue,
  societyId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
};

const validateDateRange = (
  value: { from: string; to: string },
  context: z.RefinementCtx,
) => {
  const from = new Date(`${value.from}T00:00:00.000Z`);
  const to = new Date(`${value.to}T00:00:00.000Z`);
  const dayCount = (to.getTime() - from.getTime()) / 86_400_000 + 1;
  if (dayCount < 1) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "The end date must be on or after the start date.",
    });
  } else if (dayCount > 366) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "Reports can cover up to 366 days at a time.",
    });
  }
};

export const reportAnalyticsQuerySchema = z
  .object(dateRange)
  .superRefine(validateDateRange);

export const reportBookingsQuerySchema = z
  .object({
    ...dateRange,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
  })
  .superRefine(validateDateRange);

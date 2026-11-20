import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Plan ID");
const offerFields = {
  planId: objectId,
  title: z.string().trim().min(1, "Offer title is required").max(100),
  description: z.string().trim().max(1000).optional().default(""),
  discountType: z.enum(["Percentage", "Fixed"]),
  discountValue: z.coerce.number().finite().positive("Discount must be greater than zero"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
};

const validateDiscount = (data: {
  discountType?: "Percentage" | "Fixed";
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
}, context: z.RefinementCtx) => {
  if (
    data.discountType === "Percentage" &&
    data.discountValue !== undefined &&
    data.discountValue > 100
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    });
  }
  if (
    data.startDate &&
    data.endDate &&
    data.endDate < data.startDate
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
      path: ["endDate"],
    });
  }
};

export const createOfferValidationSchema = z.object({
  body: z.object(offerFields).superRefine(validateDiscount),
});

export const updateOfferValidationSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      planId: objectId.optional(),
      title: offerFields.title.optional(),
      description: z.string().trim().max(1000).optional(),
      discountType: z.enum(["Percentage", "Fixed"]).optional(),
      discountValue: z.coerce.number().finite().positive().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      status: z.enum(["Active", "Inactive"]).optional(),
    })
    .superRefine(validateDiscount)
    .refine((body) => Object.keys(body).length > 0, "Provide at least one field"),
});

export const offerIdValidationSchema = z.object({
  params: z.object({ id: objectId }),
});

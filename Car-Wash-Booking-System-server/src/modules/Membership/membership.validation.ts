
import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

const membershipStatus = z.enum([
  "Pending",
  "Active",
  "Expired",
  "Cancelled",
]);

const paymentStatus = z.enum([
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
]);

const membershipFields = {
  carId: objectId,
  planId: objectId,
  offerId: objectId.optional(),
  couponCode: z.string().trim().min(4).max(30).optional(),
  referralCode: z.string().trim().min(4).max(30).optional(),
  societyId: objectId,
  flatId: objectId,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: membershipStatus.optional(),
  paymentStatus: paymentStatus.optional(),
  remarks: z.string().trim().max(1000).optional(),
};

export const createMembershipValidationSchema = z.object({
  body: z
    .object(membershipFields)
    .strict()
    .refine((data) => data.endDate >= data.startDate, {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }),
});

export const customerMembershipPurchaseValidationSchema = z.object({
  body: z
    .object({
      carId: objectId,
      planId: objectId,
      offerId: objectId.optional(),
      startDate: z.coerce.date().optional(),
    })
    .strict(),
});

export const updateMembershipValidationSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z
    .object({
      carId: objectId.optional(),
      planId: objectId.optional(),
      offerId: z.union([objectId, z.null()]).optional(),
      societyId: objectId.optional(),
      flatId: objectId.optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      status: membershipStatus.optional(),
      paymentStatus: paymentStatus.optional(),
      remarks: z.string().trim().max(1000).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const membershipIdValidationSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const membershipListQueryValidationSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      status: membershipStatus.optional(),
      paymentStatus: paymentStatus.optional(),
      societyId: objectId.optional(),
      flatId: objectId.optional(),
      carId: objectId.optional(),
      planId: objectId.optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .default({}),
});

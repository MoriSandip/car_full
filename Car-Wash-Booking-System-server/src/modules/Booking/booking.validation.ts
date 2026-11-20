import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID');

const createBody = z
  .object({
    societyId: objectId,
    flatId: objectId,
    carId: objectId,
    serviceId: objectId,
    slotId: objectId.optional(),
    membershipId: objectId.optional(),

    bookingDate: z.coerce.date(),
    bookingTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm'),

    paymentType: z.enum(['Membership', 'Individual']),
    paymentMethod: z.enum(['Stripe', 'Cash']).optional(),
    remarks: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paymentType === 'Membership' && !value.membershipId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['membershipId'],
        message: 'membershipId is required for membership bookings',
      });
    }

    if (value.paymentType === 'Individual' && value.membershipId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['membershipId'],
        message: 'Do not send membershipId for individual bookings',
      });
    }

    if (value.paymentType === 'Membership' && value.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Payment method is not used for membership bookings',
      });
    }
  });

export const createBookingValidationSchema = z.object({
  body: createBody,
});

export const updateBookingStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      'Pending',
      'Confirmed',
      'InProgress',
      'Completed',
      'Cancelled',
    ]),
    paymentStatus: z.enum(['Pending', 'Paid', 'Failed', 'Refunded']).optional(),
    remarks: z.string().trim().max(1000).optional(),
  }),
});

export const updateBookingValidationSchema = z.object({
  body: z.object({
    bookingDate: z.coerce.date().optional(),
    bookingTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    slotId: objectId.optional(),
    remarks: z.string().trim().max(1000).optional(),
  }),
});

export const bookingReviewValidationSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(1000).optional(),
  }),
});

export const assignWorkerValidationSchema = z.object({
  body: z.object({
    workerId: objectId,
  }),
});

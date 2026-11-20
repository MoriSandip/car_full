import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID');
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid date');

export const bookingCheckoutValidationSchema = z.object({
  body: z.object({ bookingId: objectId }),
});

export const bookingReceiptValidationSchema = z.object({
  params: z.object({ bookingId: objectId }),
});

export const membershipCheckoutValidationSchema = z.object({
  body: z.object({ membershipId: objectId }),
});

export const confirmCheckoutValidationSchema = z.object({
  body: z.object({ sessionId: z.string().min(1).max(255) }),
});

export const offlineBookingPaymentValidationSchema = z.object({
  params: z.object({ bookingId: objectId }),
  body: z.object({
    method: z.enum(['Cash', 'UPI']),
    reference: z.string().trim().max(120).optional(),
  }),
});

export const offlineMembershipPaymentValidationSchema = z.object({
  params: z.object({ membershipId: objectId }),
  body: z.object({
    method: z.enum(['Cash', 'UPI']),
    reference: z.string().trim().max(120).optional(),
  }),
});

export const paymentListValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['Pending', 'Paid', 'Failed', 'Refunded']).optional(),
    provider: z.enum(['Stripe', 'Cash', 'UPI']).optional(),
  }),
});

export const customerPaymentListValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['Pending', 'Paid', 'Failed', 'Refunded']).optional(),
    provider: z.enum(['Stripe', 'Cash', 'UPI']).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  }).refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: 'The start date must be on or before the end date' },
  ),
});

export const cashCollectionListValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['NotRecorded', 'Received', 'NotReceived']).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  }).refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: 'The start date must be on or before the end date' },
  ),
});

export const refundPaymentValidationSchema = z.object({
  params: z.object({ transactionId: objectId }),
  body: z.object({
    reason: z.string().trim().min(3).max(500),
    refundReference: z.string().trim().max(120).optional(),
  }),
});

import { z } from 'zod';

const bookingValidationSchema = z.object({
  body: z.object({
    serviceId: z.string({
      error: 'Service ID is required and must be a string',
    }),
    userId: z.string({
      error: 'User ID is required and must be a string',
    }),
    slotId: z.string({
      error: 'Slot ID is required and must be a string',
    }),
    date: z.string({
      error: 'Date must be in the format YYYY-MM-DD',
    }),
    startTime: z.string({
      error: 'startTime is required and must be a string',
    }),
    endTime: z.string({
      error: 'endTime is required and must be a string',
    }),
    payment: z
      .string({
        error: 'payment must be a string',
      })
      .optional(),
    status: z
      .string({
        error: 'status must be a string',
      })
      .optional(),

    isDeleted: z.boolean().optional().default(false),
  }),
});

export const BookingValidation = {
  bookingValidationSchema,
};

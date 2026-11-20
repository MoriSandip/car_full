import mongoose from 'mongoose';
import { z } from 'zod';

const slotValidationSchema = z.object({
  body: z.object({
    service: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid service ID',
    }),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, { message: 'Invalid start time format' }),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, { message: 'Invalid end time format' }),
    isDeleted: z.string().optional(),
  }),
});

const washServiceSlotValidationSchema = z.object({
  body: z
    .object({
      washServiceId: z.string().refine(mongoose.Types.ObjectId.isValid, {
        message: 'Invalid wash service ID',
      }),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'Date must use YYYY-MM-DD format',
        })
        .optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'Start date must use YYYY-MM-DD format',
        })
        .optional(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'End date must use YYYY-MM-DD format',
        })
        .optional(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'Invalid start time format',
      }),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'Invalid end time format',
      }),
    })
    .superRefine((body, context) => {
      const hasRange = Boolean(body.startDate || body.endDate);
      if (hasRange) {
        if (!body.startDate || !body.endDate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [body.startDate ? 'endDate' : 'startDate'],
            message: 'Both startDate and endDate are required',
          });
          return;
        }
        if (body.date) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['date'],
            message: 'Use either date or a startDate/endDate range',
          });
        }
        if (body.endDate < body.startDate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'End date must be on or after start date',
          });
        }
        return;
      }

      if (!body.date) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'Provide a date or both startDate and endDate',
        });
      }
    }),
});

export const SlotsValidation = {
  slotValidationSchema,
  washServiceSlotValidationSchema,
};

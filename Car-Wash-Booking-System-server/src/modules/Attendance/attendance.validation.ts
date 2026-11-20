import { z } from 'zod';

const selfie = z
  .string()
  .min(1, 'A selfie is required')
  .max(7_000_000, 'Selfie must be 5 MB or smaller')
  .regex(
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    'Selfie must be a JPEG, PNG, or WebP image',
  )
  .refine((value) => Math.floor(((value.length - value.indexOf(',') - 1) * 3) / 4) <= 5_000_000, {
    message: 'Selfie must be 5 MB or smaller',
  });

const punchValidationSchema = z.object({
  body: z.object({ selfie }),
});

export const AttendanceValidation = { punchValidationSchema };

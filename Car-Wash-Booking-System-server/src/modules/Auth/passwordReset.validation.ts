import { z } from 'zod';

const passwordResetRole = z.enum(['ADMIN', 'CUSTOMER', 'WORKER']);

const requestPasswordResetValidationSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    role: passwordResetRole,
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    role: passwordResetRole,
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit reset code'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
  }),
});

export const PasswordResetValidation = {
  requestPasswordResetValidationSchema,
  resetPasswordValidationSchema,
};

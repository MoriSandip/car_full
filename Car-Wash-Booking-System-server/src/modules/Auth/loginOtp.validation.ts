import { z } from 'zod';

const loginOtpRequestValidationSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'customer', 'worker']),
    channel: z.enum(['email', 'phone']),
    identifier: z.string().trim().min(1).max(254),
  }),
});

const loginOtpVerifyValidationSchema = z.object({
  body: z.object({
    role: z.enum(['admin', 'customer', 'worker']),
    channel: z.enum(['email', 'phone']),
    identifier: z.string().trim().min(1).max(254),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  }),
});

export const LoginOtpValidation = {
  loginOtpRequestValidationSchema,
  loginOtpVerifyValidationSchema,
};

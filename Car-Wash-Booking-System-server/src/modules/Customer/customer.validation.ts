import { z } from 'zod';
import { CUSTOMER_STATUS } from './customer.constant';

const registerCustomerValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Enter a valid email'),
    phone: z.string().trim().min(10, 'Enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    address: z.string().trim().optional(),
    profileImage: z
      .object({
        image: z.string().min(4).max(7_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      })
      .optional(),
  }),
});

const customerLoginValidationSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const updateCustomerValidationSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().min(10).optional(),
      address: z.string().trim().optional(),
      imageUrl: z.string().trim().url().max(2048).optional().or(z.literal('')),
      status: z.nativeEnum(CUSTOMER_STATUS).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

export const CustomerValidation = {
  registerCustomerValidationSchema,
  customerLoginValidationSchema,
  updateCustomerValidationSchema,
};
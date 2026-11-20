import { z } from 'zod';

const userValidationSchema = z.object({
  body: z.object({
    name: z.string({
      error: 'name must be string',
    }),
    imageUrl: z.string({
      error: 'imageUrl must be string',
    }),
    email: z
      .string({
        error: 'email must be string',
      })
      .email(),
    password: z
      .string()
      .max(20, { message: 'Password can not be more than 20 characters' }),
    phone: z.string({
      error: 'phone must be string',
    }),
    role: z.enum(['admin', 'user', 'worker']).default('user'),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'email must be string',
      })
      .email(),
    password: z.string({ error: 'Password is required' }),
  }),
});

export const UserValidation = {
  userValidationSchema,
  loginValidationSchema,
};

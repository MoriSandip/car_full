import { z } from 'zod';
import { USER_ROLE, USER_STATUS } from './user.constant';

const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string({
      error: 'Name is required',
    }),
    role: z.nativeEnum(USER_ROLE),
    email: z
      .string({
        error: 'Email is required',
      })
      .email({
        message: 'Invalid email',
      }),
    password: z.string({
      error: 'Password is required',
    }),
    status: z.nativeEnum(USER_STATUS).default(USER_STATUS.ACTIVE),
    mobileNumber: z.string().optional(),
    verified: z.boolean().optional().default(false),
    followers: z.array(z.string()).optional(),
    following: z.array(z.string()).optional(),
  }),
});

const updateUserBodySchema = z
  .object({
    role: z.enum(['admin', 'user']).optional(),
    userStatus: z.enum(['in-progress', 'blocked']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one supported user field must be provided.',
  });

const updateUserValidationSchema = z.object({
  body: updateUserBodySchema,
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
};

export type TUserUpdate = z.infer<typeof updateUserBodySchema>;

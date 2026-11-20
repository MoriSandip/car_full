
import { z } from 'zod';
import { WORKER_STATUS } from './worker.constant';
 
const createWorkerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    status: z.nativeEnum(WORKER_STATUS).optional(),
    address: z.string().optional(),
  }),
});

const updateWorkerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
    status: z.nativeEnum(WORKER_STATUS).optional(),
    address: z.string().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    'At least one field is required',
  ),
});

const workerLoginValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const cleaningProgressValidationSchema = z.object({
  body: z
    .object({
      beforePhoto: z
        .string()
        .max(2_800_000)
        .regex(/^data:image\/(jpeg|png|webp);base64,/, 'Before photo must be a supported image')
        .optional(),
      afterPhoto: z
        .string()
        .max(2_800_000)
        .regex(/^data:image\/(jpeg|png|webp);base64,/, 'After photo must be a supported image')
        .optional(),
      cleaningChecklist: z
        .object({
          exteriorWash: z.boolean(),
          interiorCleaning: z.boolean(),
          dashboard: z.boolean(),
          tyreDressing: z.boolean(),
          vacuumCleaning: z.boolean(),
        })
        .optional(),
      workerNotes: z.string().trim().max(1000).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one progress field is required'),
});

export const WorkerValidation = {
  createWorkerValidationSchema,
  updateWorkerValidationSchema,
  workerLoginValidationSchema,
  cleaningProgressValidationSchema,
};

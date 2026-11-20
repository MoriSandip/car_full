import { z } from 'zod';

const serviceSchema = z.object({
  body: z.object({
    title: z.string({
      error: 'Title is required',
    }).min(1, 'Title is required'),

    description: z.string({
      error: 'Description is required',
    }).min(1, 'Description is required'),

    price: z.string({
      error: 'Price is required',
    }).min(1, 'Price is required'),

    duration: z.coerce.number({
      error: 'Duration is required',
    }).nonnegative(),

    image: z.array(z.string()).default([]),

    isDeleted: z.boolean().optional(),
  }),
});

const updateServiceSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.string().optional(),
    duration: z.coerce.number().nonnegative().optional(),
    image: z.array(z.string()).optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const ServiceValidation = {
  serviceSchema,
  updateServiceSchema,
};
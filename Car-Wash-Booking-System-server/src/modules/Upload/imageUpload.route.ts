import { Router } from 'express';
import { z } from 'zod';
import auth from '../../app/middlewares/auth';
import validateRequest from '../../app/middlewares/validateRequest';
import uploadRateLimiter from '../../app/middlewares/uploadRateLimiter';
import { ImageUploadController } from './imageUpload.controller';

const imageUploadValidationSchema = z.object({
  body: z.object({
    image: z
      .string()
      .min(4)
      .max(7_000_000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
});

const router = Router();

router.post(
  '/images',
  uploadRateLimiter,
  auth('admin', 'user', 'CUSTOMER', 'WORKER'),
  validateRequest(imageUploadValidationSchema),
  ImageUploadController.uploadImage,
);

export const ImageUploadRoutes = router;

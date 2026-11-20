import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import notFound from './app/middlewares/notFound';
import globalErrorHandler from './app/middlewares/globalErrorhandler';
import apiRateLimiter from './app/middlewares/apiRateLimiter';
import router from './app/routes';
import { StripePaymentController } from './modules/payment/stripe.controller';

const app: Application = express();
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': isProduction ? [] : null,
      },
    },
    strictTransportSecurity: isProduction ? undefined : false,
  }),
);

if (process.env.VERCEL) {
  app.set('trust proxy', 1);
}

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  'https://car-washing-booking-system-client.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      const localDevelopmentOrigin =
        process.env.NODE_ENV !== 'production' &&
        origin !== undefined &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        localDevelopmentOrigin
      ) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
  }),
);

app.use('/api/v1', apiRateLimiter);

app.post(
  '/api/v1/payment/stripe/webhook',
  express.raw({ type: 'application/json' }),
  StripePaymentController.stripeWebhook,
);

app.use(express.json({ limit: '8mb' }));

app.use('/api/v1', router);

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
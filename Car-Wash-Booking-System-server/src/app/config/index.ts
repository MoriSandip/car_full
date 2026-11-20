import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default {
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  amr_pay_url: process.env.AMRPAYURL,
  amr_pay_id: process.env.AMRPAYID,
  amr_pay_key: process.env.AMRPAYKey,
  amr_pay_verify_url: process.env.AMRPAYVERIFYURL,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  app_base_url: process.env.APP_BASE_URL,
  api_public_url: process.env.API_PUBLIC_URL,
  smtp_host: process.env.SMTP_HOST,
  smtp_port: Number(process.env.SMTP_PORT || 587),
  smtp_user: process.env.SMTP_USER,
  smtp_password: process.env.SMTP_PASSWORD,
  smtp_from: process.env.SMTP_FROM,
  imgbb_api_key: process.env.IMGBB_API_KEY,
};

import { model, Schema } from 'mongoose';

export type TLoginOtp = {
  role: 'admin' | 'customer' | 'worker';
  channel: 'email' | 'phone';
  identifier: string;
  userId: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
};

const loginOtpSchema = new Schema<TLoginOtp>(
  {
    role: { type: String, enum: ['admin', 'customer', 'worker'], required: true },
    channel: { type: String, enum: ['email', 'phone'], required: true },
    identifier: { type: String, required: true },
    userId: { type: String, required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

loginOtpSchema.index({ role: 1, channel: 1, identifier: 1 });

export const LoginOtp = model<TLoginOtp>('LoginOtp', loginOtpSchema);

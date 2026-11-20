import { model, Schema } from 'mongoose';

export type PasswordResetRole = 'ADMIN' | 'CUSTOMER' | 'WORKER';

type TPasswordReset = {
  email: string;
  role: PasswordResetRole;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
};

const passwordResetSchema = new Schema<TPasswordReset>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'CUSTOMER', 'WORKER'],
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

passwordResetSchema.index({ role: 1, email: 1 }, { unique: true });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<TPasswordReset>(
  'PasswordReset',
  passwordResetSchema,
);

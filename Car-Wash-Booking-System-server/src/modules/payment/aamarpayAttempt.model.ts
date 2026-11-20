import { model, Schema } from 'mongoose';

export interface IAamarpayAttempt {
  tranId: string;
  userId: string;
  email: string;
  bookingIds: string[];
  amount: number;
  totalHoursInDecimal: number;
  status: 'pending' | 'paid';
}

const aamarpayAttemptSchema = new Schema<IAamarpayAttempt>(
  {
    tranId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    bookingIds: { type: [String], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    totalHoursInDecimal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true },
);

export const AamarpayAttempt = model<IAamarpayAttempt>(
  'AamarpayAttempt',
  aamarpayAttemptSchema,
);

import { model, Schema, Types } from 'mongoose';

export type TPaymentTransactionStatus =
  | 'Pending'
  | 'Paid'
  | 'Failed'
  | 'Refunded';

export interface IPaymentTransaction {
  bookingId?: Types.ObjectId;
  membershipId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  amount: number;
  currency: 'inr';
  provider: 'Stripe' | 'Cash' | 'UPI';
  status: TPaymentTransactionStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  reference?: string;
  recordedBy?: Types.ObjectId;
  recordedByWorker?: Types.ObjectId;
  verifiedAt?: Date;
  refundedAt?: Date;
  refundReference?: string;
  refundReason?: string;
  refundedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'NewBooking',
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['inr'], required: true, default: 'inr' },
    provider: {
      type: String,
      enum: ['Stripe', 'Cash', 'UPI'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      required: true,
      default: 'Pending',
      index: true,
    },
    stripeSessionId: { type: String, sparse: true, unique: true },
    stripePaymentIntentId: { type: String },
    reference: { type: String, trim: true, maxlength: 120 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByWorker: { type: Schema.Types.ObjectId, ref: 'Worker' },
    verifiedAt: { type: Date },
    refundedAt: { type: Date },
    refundReference: { type: String, trim: true, maxlength: 120 },
    refundReason: { type: String, trim: true, maxlength: 500 },
    refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

paymentTransactionSchema.pre('validate', function (next) {
  if (Boolean(this.bookingId) === Boolean(this.membershipId)) {
    next(new Error('A payment transaction must reference exactly one booking or membership'));
    return;
  }
  next();
});

paymentTransactionSchema.index({ bookingId: 1, createdAt: -1 });
paymentTransactionSchema.index({ membershipId: 1, createdAt: -1 });
paymentTransactionSchema.index({ recordedByWorker: 1, provider: 1, createdAt: -1 });

export const PaymentTransaction = model<IPaymentTransaction>(
  'PaymentTransaction',
  paymentTransactionSchema,
);

import { Schema, model } from 'mongoose';
import { IBooking } from './booking.interface';

const bookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
    },
    flatId: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'WashService',
      required: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: 'Slot',
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
    },

    bookingDate: {
      type: Date,
      required: true,
    },
    bookingTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    paymentType: {
      type: String,
      enum: ['Membership', 'Individual'],
      required: true,
    },
    serviceNameSnapshot: {
      type: String,
      required: true,
    },
    servicePriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPayable: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Stripe', 'Cash', 'UPI'],
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    cashCollectionStatus: {
      type: String,
      enum: ['NotRecorded', 'Received', 'NotReceived'],
    },
    cashCollectionUpdatedAt: {
      type: Date,
      default: null,
    },
    cashCollectionUpdatedByWorker: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    cashCollectionUpdatedByAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    workStatus: {
      type: String,
      enum: ['NotStarted', 'Working', 'Paused', 'Completed'],
      default: 'NotStarted',
    },
    currentWorkStartedAt: {
      type: Date,
      default: null,
    },
    workSessions: [
      {
        startedAt: {
          type: Date,
          required: true,
        },
        endedAt: {
          type: Date,
          default: null,
        },
        durationSeconds: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    totalWorkingSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    workCompletedAt: {
      type: Date,
      default: null,
    },
    beforePhoto: { type: String, default: '' },
    afterPhoto: { type: String, default: '' },
    cleaningChecklist: {
      exteriorWash: { type: Boolean, default: false },
      interiorCleaning: { type: Boolean, default: false },
      dashboard: { type: Boolean, default: false },
      tyreDressing: { type: Boolean, default: false },
      vacuumCleaning: { type: Boolean, default: false },
    },
    workerNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    customerRating: { type: Number, min: 1, max: 5 },
    customerReview: { type: String, trim: true, maxlength: 1000, default: '' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

bookingSchema.index({ bookingDate: 1, bookingTime: 1, status: 1 });
bookingSchema.index({ carId: 1, bookingDate: 1 });
bookingSchema.index({ societyId: 1, isDeleted: 1 });
bookingSchema.index({ customerId: 1, isDeleted: 1 });
bookingSchema.index({
  workerId: 1,
  bookingDate: 1,
  status: 1,
  isDeleted: 1,
});

const Booking = model<IBooking>('NewBooking', bookingSchema);

export default Booking;

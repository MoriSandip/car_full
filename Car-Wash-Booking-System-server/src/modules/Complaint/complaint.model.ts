import { model, Schema } from "mongoose";

export const COMPLAINT_CATEGORIES = [
  "Booking",
  "Payment",
  "Service quality",
  "Membership",
  "Other",
] as const;

export const COMPLAINT_STATUSES = [
  "Open",
  "InProgress",
  "Resolved",
  "Closed",
] as const;

export const COMPLAINT_PRIORITIES = ["Low", "Normal", "High"] as const;

const complaintMessageSchema = new Schema(
  {
    senderRole: { type: String, enum: ["CUSTOMER", "ADMIN"], required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const complaintSchema = new Schema(
  {
    ticketNo: { type: String, required: true, unique: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "NewBooking",
      default: null,
    },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "Open",
      index: true,
    },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: "Normal",
    },
    messages: { type: [complaintMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

complaintSchema.index({ customerId:  1, updatedAt: -1 });
complaintSchema.index({ status: 1, category: 1, updatedAt: -1 });

export const Complaint = model("Complaint", complaintSchema);

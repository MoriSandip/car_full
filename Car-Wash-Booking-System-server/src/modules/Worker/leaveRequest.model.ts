import { model, Schema, Types } from "mongoose";

export type TLeaveRequest = {
  workerId: Types.ObjectId;
  startDate: string;
  endDate: string;
  leaveType: "Paid" | "Unpaid";
  halfDay: boolean;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
};

const leaveRequestSchema = new Schema<TLeaveRequest>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    leaveType: { type: String, enum: ["Paid", "Unpaid"], required: true },
    halfDay: { type: Boolean, default: false },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "Cancelled"], default: "Pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false },
);

leaveRequestSchema.index({ workerId: 1, startDate: 1, endDate: 1, status: 1 });

export const LeaveRequest = model<TLeaveRequest>("LeaveRequest", leaveRequestSchema);

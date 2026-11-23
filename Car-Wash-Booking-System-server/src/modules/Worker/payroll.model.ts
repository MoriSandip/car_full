import { model, Schema, Types } from "mongoose";

export type TPayroll = {
  workerId: Types.ObjectId;
  periodStart: string;
  periodEnd: string;
  monthlySalary: number;
  basePay: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  overtimePay: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  currency: string;
  status: "Draft" | "Approved" | "Paid";
  generatedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  paidBy?: Types.ObjectId;
  paidAt?: Date;
  paymentReference?: string;
};

const payrollSchema = new Schema<TPayroll>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    periodStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    periodEnd: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    monthlySalary: { type: Number, required: true, min: 0 },
    basePay: { type: Number, required: true, min: 0 },
    absentDays: { type: Number, required: true, min: 0 },
    paidLeaveDays: { type: Number, required: true, min: 0 },
    unpaidLeaveDays: { type: Number, required: true, min: 0 },
    overtimeHours: { type: Number, required: true, min: 0 },
    overtimePay: { type: Number, required: true, min: 0 },
    deductions: { type: Number, required: true, min: 0 },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", required: true },
    status: { type: String, enum: ["Draft", "Approved", "Paid"], default: "Draft", index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: Date,
    paymentReference: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true, versionKey: false },
);

payrollSchema.index({ workerId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export const Payroll = model<TPayroll>("Payroll", payrollSchema);

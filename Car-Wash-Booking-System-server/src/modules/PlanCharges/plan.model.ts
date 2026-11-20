import { Schema, model } from "mongoose";
import { TPlan } from "./plan.interface";

const planSchema = new Schema<TPlan>(
  {
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: [true, "Society is required"],
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    billingCycle: {
      type: String,
      enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Custom"],
      required: true,
      default: "Monthly",
    },
    price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
    includedWashes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    validityDays: {
      type: Number,
      required: true,
      min: [1, "Validity must be at least one day"],
      validate: { validator: Number.isInteger, message: "Validity must be a whole number" },
    },
    services: {
      type: [String],
      required: true,
      validate: { validator: (items: string[]) => items.length > 0, message: "At least one service is required" },
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

planSchema.index(
  { societyId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    collation: { locale: "en", strength: 2 },
    name: "unique_active_plan_name_per_society",
  }
);

const Plan = model<TPlan>("Plan", planSchema);
export default Plan;

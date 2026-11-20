import { Schema, model } from "mongoose";
import { SocietyModel, TSociety } from "./society.interface";

const societySchema = new Schema<TSociety, SocietyModel>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      required: true,
    },
    verificationNote: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
    },
    createdByRole: {
      type: String,
      enum: ["ADMIN", "CUSTOMER"],
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const Society = model<TSociety, SocietyModel>(
  "Society",
  societySchema,
);
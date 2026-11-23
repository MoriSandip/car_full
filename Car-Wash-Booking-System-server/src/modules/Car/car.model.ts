
import { Schema, model } from "mongoose";
import { TCar } from "./car.interface";

const carSchema = new Schema<TCar>(
  {
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: [true, "Society is required"],
      index: true,
    },

    flatId: {
      type: Schema.Types.ObjectId,
      ref: "Flat",
      required: [true, "Flat is required"],
      index: true,
    },

    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },

    ownerPhone: {
      type: String,
      required: [true, "Owner phone is required"],
      trim: true,
    },

    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      trim: true,
      uppercase: true,
    },

    make: {
      type: String,
      required: [true, "Car make is required"],
      trim: true,
    },

    model: {
      type: String,
      required: [true, "Car model is required"],
      trim: true,
    },

    color: {
      type: String,
      required: [true, "Car color is required"],
      trim: true,
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    carType: {
      type: String,
      enum: ["Hatchback", "Sedan", "SUV", "MUV", "Luxury", "Other"],
      required: true,
    },

    parkingSlot: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      default: "Active",
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // "admin" preserves compatibility with existing admin records.
    // "ADMIN" is also accepted for role consistency.
    createdByRole: {
      type: String,
      enum: ["admin", "ADMIN", "CUSTOMER"],
      required: true,
      index: true,
    },

    verifiedBy: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verificationNote: {
      type: String,
      trim: true,
      default: "",
    },

    qrToken: {
      type: String,
      select: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

carSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "unique_active_car_registration",
  },
);

carSchema.index({ societyId: 1, flatId: 1 });
carSchema.index({ createdBy: 1, verificationStatus: 1 });
carSchema.index(
  { qrToken: 1 },
  {
    unique: true,
    partialFilterExpression: { qrToken: { $type: "string" } },
    name: "unique_car_qr_token",
  },
);

export const Car = model<TCar>("Car", carSchema);

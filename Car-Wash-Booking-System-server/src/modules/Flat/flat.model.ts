import { Schema, model } from "mongoose";
import { TFlat } from "./flat.interface";

const flatSchema = new Schema<TFlat>(
  {
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: [true, "Society is required"],
      index: true,
    },
    flatNumber: {
      type: String,
      required: [true, "Flat number is required"],
      trim: true,
      uppercase: true,
    },
    block: {
      type: String,
      trim: true,
      default: "",
    },
    floorNumber: {
      type: Number,
      min: [0, "Floor number cannot be negative"],
    },
    flatType: {
      type: String,
      required: [true, "Flat type is required"],
      trim: true,
    },
    area: {
      type: Number,
      min: [0, "Area cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Maintenance"],
      default: "Available",
      required: true,
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
   createdByRole: {
  type: String,
  required: true,
  enum: ["admin", "CUSTOMER", "customer"],
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
    description: {
      type: String,
      trim: true,
      default: "",
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
  }
);

// Unique active flat number within the same society.
flatSchema.index(
  { societyId: 1, flatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "unique_active_flat_per_society",
  }
);

const Flat = model<TFlat>("Flat", flatSchema);

export default Flat;
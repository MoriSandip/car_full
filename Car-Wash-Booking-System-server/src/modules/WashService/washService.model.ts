
import { Schema, model } from "mongoose";
import { IWashService } from "./washService.interface";

const washServiceSchema = new Schema<IWashService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

washServiceSchema.index({ name: 1, isDeleted: 1 });

const WashService = model<IWashService>(
  "WashService",
  washServiceSchema
);

export default WashService;

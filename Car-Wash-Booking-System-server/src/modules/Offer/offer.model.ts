import { model, Schema } from "mongoose";
import { TOffer } from "./offer.interface";

const offerSchema = new Schema<TOffer>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

offerSchema.index({ planId: 1, status: 1, startDate: 1, endDate: 1 });

const Offer = model<TOffer>("Offer", offerSchema);
export default Offer;

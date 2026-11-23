import { model, Schema } from "mongoose";

const couponRedemptionSchema = new Schema(
  {
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    membershipId: { type: Schema.Types.ObjectId, ref: "Membership" },
  },
  { timestamps: true, versionKey: false },
);

couponRedemptionSchema.index({ offerId: 1, customerId: 1 });

export default model("CouponRedemption", couponRedemptionSchema);

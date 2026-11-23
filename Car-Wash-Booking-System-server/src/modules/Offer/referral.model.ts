import { model, Schema } from "mongoose";

const referralSchema = new Schema(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    referredId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Pending", index: true },
    rewardAmount: { type: Number, min: 0, default: 100 },
    membershipId: { type: Schema.Types.ObjectId, ref: "Membership" },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export default model("Referral", referralSchema);

import { Types } from "mongoose";
import Plan from "../PlanCharges/plan.model";
import { TOffer } from "./offer.interface";
import Offer from "./offer.model";
import CouponRedemption from "./couponRedemption.model";
import Referral from "./referral.model";
import { Customer } from "../Customer/customer.model";

type TOfferPayload = {
  planId?: string;
  title?: string;
  description?: string;
  discountType?: TOffer["discountType"];
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
  status?: TOffer["status"];
  couponCode?: string;
  usageLimit?: number | null;
  perCustomerLimit?: number;
  redeemedCount?: number;
};

const ensurePlan = async (planId: string) => {
  if (!Types.ObjectId.isValid(planId)) throw new Error("Invalid Plan ID");
  const plan = await Plan.findOne({
    _id: planId,
    isDeleted: false,
    status: "Active",
  }).select("_id");
  if (!plan) throw new Error("Active plan not found");
};

const createOffer = async (payload: TOfferPayload) => {
  if (!payload.planId) throw new Error("Plan is required");
  await ensurePlan(payload.planId);
  const normalized = {
    ...payload,
    couponCode: payload.couponCode?.trim().toUpperCase() || undefined,
  };
  if (normalized.couponCode) {
    const existing = await Offer.findOne({
      couponCode: normalized.couponCode,
      isDeleted: false,
    }).select("_id");
    if (existing) throw new Error("Coupon code already exists");
  }
  return Offer.create(normalized);
};

const getOffers = async (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (typeof query.planId === "string" && query.planId) {
    if (!Types.ObjectId.isValid(query.planId)) throw new Error("Invalid Plan ID");
    filter.planId = query.planId;
  }
  if (
    typeof query.status === "string" &&
    ["Active", "Inactive"].includes(query.status)
  ) {
    filter.status = query.status;
  }
  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  return Offer.find(filter)
    .populate({
      path: "planId",
      select: "name price societyId status",
      populate: { path: "societyId", select: "name city" },
    })
    .sort({ createdAt: -1 });
};

const getOffer = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Offer ID");
  const offer = await Offer.findOne({ _id: id, isDeleted: false }).populate(
    "planId",
    "name price societyId",
  );
  if (!offer) throw new Error("Offer not found");
  return offer;
};

const updateOffer = async (id: string, payload: TOfferPayload) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Offer ID");
  const existing = await Offer.findOne({ _id: id, isDeleted: false });
  if (!existing) throw new Error("Offer not found");
  if (
    payload.planId &&
    String(existing.planId) !== payload.planId
  ) {
    await ensurePlan(payload.planId);
  }

  const mergedStartDate = payload.startDate ?? existing.startDate;
  const mergedEndDate = payload.endDate ?? existing.endDate;
  if (mergedEndDate < mergedStartDate) {
    throw new Error("End date must be on or after start date");
  }
  const discountType = payload.discountType ?? existing.discountType;
  const discountValue = payload.discountValue ?? existing.discountValue;
  if (discountType === "Percentage" && discountValue > 100) {
    throw new Error("Percentage discount cannot exceed 100%");
  }
  if (payload.couponCode) {
    const duplicate = await Offer.findOne({
      _id: { $ne: id },
      couponCode: payload.couponCode.trim().toUpperCase(),
      isDeleted: false,
    }).select("_id");
    if (duplicate) throw new Error("Coupon code already exists");
  }
  const updates = {
    ...payload,
    couponCode: payload.couponCode
      ? payload.couponCode.trim().toUpperCase()
      : payload.couponCode === ""
        ? undefined
        : existing.couponCode,
  };
  if (payload.usageLimit === null) {
    delete (updates as { usageLimit?: number }).usageLimit;
  }

  const updateOperations: Record<string, unknown> = {
    $set: updates,
  };
  if (payload.usageLimit === null) {
    delete (updates as { usageLimit?: number }).usageLimit;
    updateOperations.$unset = { usageLimit: 1 };
  }
  return Offer.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updateOperations,
    { new: true, runValidators: true },
  ).populate("planId", "name price societyId");
};

const deleteOffer = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Offer ID");
  const offer = await Offer.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, status: "Inactive" } },
    { new: true },
  );
  if (!offer) throw new Error("Offer not found");
  return offer;
};

const validateCoupon = async (
  customerId: string,
  planId: string,
  couponCode: string,
) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(planId)) {
    throw new Error("Invalid coupon request");
  }
  const code = couponCode.trim().toUpperCase();
  const offer = await Offer.findOne({
    couponCode: code,
    planId,
    status: "Active",
    isDeleted: false,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  }).populate("planId", "name price");
  if (!offer) throw new Error("Coupon is invalid or not applicable to this plan");
  if (offer.usageLimit && offer.redeemedCount >= offer.usageLimit) {
    throw new Error("Coupon usage limit has been reached");
  }
  if (offer.perCustomerLimit) {
    const customerUses = await CouponRedemption.countDocuments({
      offerId: offer._id,
      customerId,
    });
    if (customerUses >= offer.perCustomerLimit) {
      throw new Error("You have already used this coupon");
    }
  }
  const plan = offer.planId as unknown as { price?: number };
  const baseAmount = Number(plan?.price ?? 0);
  const discount =
    offer.discountType === "Percentage"
      ? (baseAmount * offer.discountValue) / 100
      : offer.discountValue;
  return {
    offerId: String(offer._id),
    code,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    discountAmount: Math.max(0, Math.min(baseAmount, discount)),
  };
};

const recordCouponRedemption = async (
  customerId: string,
  offerId: string,
  membershipId: string,
) => {
  await CouponRedemption.create({ customerId, offerId, membershipId });
  await Offer.findByIdAndUpdate(offerId, { $inc: { redeemedCount: 1 } });
};

const generateReferralCode = async (customerId: string) => {
  const customer = await Customer.findById(customerId).select("_id name");
  if (!customer) throw new Error("Customer not found");
  if (customer.referralCode) return customer.referralCode;
  const namePart = String(customer.name)
    .replace(/[^A-Z0]/gi, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "X");
  let code = "";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.random().toString(36).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 5).padEnd(5, "0");
    code = `${namePart}${suffix}`;
    const existing = await Customer.findOne({ referralCode: code }).select("_id");
    if (!existing) break;
  }
  customer.referralCode = code;
  await customer.save();
  return code;
};

const getReferralSummary = async (customerId: string) => {
  if (!Types.ObjectId.isValid(customerId)) throw new Error("Invalid customer");
  const code = await generateReferralCode(customerId);
  const referrals = await Referral.find({ referrerId: customerId })
    .populate("referredId", "name email")
    .sort({ createdAt: -1 })
    .lean();
  const completed = referrals.filter((item) => item.status === "Completed");
  return {
    code,
    rewardAmount: 100,
    totalReferrals: referrals.length,
    completedReferrals: completed.length,
    pendingReferrals: referrals.filter((item) => item.status === "Pending").length,
    earnedAmount: completed.reduce((sum, item) => sum + Number(item.rewardAmount || 0), 0),
    referrals,
  };
};

const redeemReferralCode = async (referredId: string, rawCode: string) => {
  if (!Types.ObjectId.isValid(referredId)) throw new Error("Invalid customer");
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Referral code is required");
  const referrer = await Customer.findOne({ referralCode: code }).select("_id name");
  if (!referrer) throw new Error("Referral code is invalid");
  if (String(referrer._id) === referredId) throw new Error("You cannot refer yourself");
  const existing = await Referral.findOne({ referredId });
  if (existing) return existing;
  return Referral.create({ referrerId: referrer._id, referredId, code });
};

const applyCompletedReferralReward = async (
  referredId: string,
  membershipId: string,
  amount: number,
) => {
  const referral = await Referral.findOne({ referredId, status: "Pending" });
  if (!referral) return { amount, referralReward: 0 };
  const referralReward = Math.min(Number(referral.rewardAmount || 100), amount);
  await Referral.updateOne(
    { _id: referral._id, status: "Pending" },
    {
      $set: {
        status: "Completed",
        membershipId,
        completedAt: new Date(),
      },
    },
  );
  return { amount: Math.max(0, amount - referralReward), referralReward };
};

export const OfferServices = {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
  recordCouponRedemption,
  getReferralSummary,
  redeemReferralCode,
  applyCompletedReferralReward,
};

import { Types } from "mongoose";
import Plan from "../PlanCharges/plan.model";
import { TOffer } from "./offer.interface";
import Offer from "./offer.model";

type TOfferPayload = {
  planId?: string;
  title?: string;
  description?: string;
  discountType?: TOffer["discountType"];
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
  status?: TOffer["status"];
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
  return Offer.create(payload);
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

  return Offer.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: payload },
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

export const OfferServices = {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
};

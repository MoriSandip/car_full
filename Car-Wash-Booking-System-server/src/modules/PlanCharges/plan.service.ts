import { Types } from "mongoose";
import Plan from "./plan.model";
import { Society } from "../Society/society.model";

type TPlanPayload = {
  societyId?: string;
  name?: string;
  description?: string;
  billingCycle?: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "Custom";
  price?: number;
  includedWashes?: number;
  validityDays?: number;
  services?: string[];
  status?: "Active" | "Inactive";
};

const ensureActiveSociety = async (societyId: string) => {
  if (!Types.ObjectId.isValid(societyId)) throw new Error("Invalid Society ID");
  const society = await Society.findOne({
    _id: societyId,
    isDeleted: { $ne: true },
  }).select("_id status");
  if (!society) throw new Error("Society not found or deleted");
  if (society.status !== "VERIFIED") {
    throw new Error("Selected Society is not verified by admin yet");
  }
};

const normalizePayload = (payload: TPlanPayload) => {
  const normalized = { ...payload };
  if (normalized.name !== undefined) normalized.name = normalized.name.trim();
  if (normalized.description !== undefined) normalized.description = normalized.description.trim();
  if (normalized.services !== undefined) {
    normalized.services = [...new Map(
      normalized.services.map((service) => [service.trim().toLowerCase(), service.trim()])
    ).values()].filter(Boolean);
  }
  return normalized;
};

const createPlan = async (payload: TPlanPayload) => {
  const normalized = normalizePayload(payload);
  if (!normalized.societyId) throw new Error("Society is required");
  await ensureActiveSociety(normalized.societyId);
  return Plan.create(normalized);
};

const getAllPlans = async (query: Record<string, unknown>) => {
  const filter: Record<string, any> = { isDeleted: false };
  if (typeof query.societyId === "string" && query.societyId) {
    if (!Types.ObjectId.isValid(query.societyId)) throw new Error("Invalid Society ID");
    filter.societyId = query.societyId;
  }
  if (typeof query.status === "string" && ["Active", "Inactive"].includes(query.status)) {
    filter.status = query.status;
  }
  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { services: { $regex: search, $options: "i" } },
    ];
  }
  return Plan.find(filter)
    .populate("societyId", "name city")
    .sort({ createdAt: -1 });
};

const getSinglePlan = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Plan ID");
  const plan = await Plan.findOne({ _id: id, isDeleted: false }).populate("societyId", "name city address");
  if (!plan) throw new Error("Plan not found");
  return plan;
};

const updatePlan = async (id: string, payload: TPlanPayload) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Plan ID");
  const existing = await Plan.findOne({ _id: id, isDeleted: false });
  if (!existing) throw new Error("Plan not found");
  const normalized = normalizePayload(payload);
  await ensureActiveSociety(
    normalized.societyId || String(existing.societyId),
  );
  return Plan.findByIdAndUpdate(id, normalized, { new: true, runValidators: true })
    .populate("societyId", "name city");
};

const deletePlan = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Plan ID");
  const plan = await Plan.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const PlanServices = { createPlan, getAllPlans, getSinglePlan, updatePlan, deletePlan };

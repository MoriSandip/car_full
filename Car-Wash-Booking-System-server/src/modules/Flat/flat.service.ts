import { Types } from "mongoose";
import Flat from "./flat.model";
import { Society } from "../Society/society.model";

type TFlatPayload = {
  societyId?: string;
  flatNumber?: string;
  block?: string;
  floorNumber?: number;
  flatType?: string;
  area?: number;
  status?: "Available" | "Occupied" | "Maintenance";
  description?: string;
};

type TCreatorRole = "ADMIN" | "CUSTOMER";

const isAdminRole = (role: TCreatorRole) => role === "ADMIN";

const ownerFilter = (userId: string, role: TCreatorRole) => {
  if (isAdminRole(role)) return {};
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid customer ID");
  }
  return {
    createdBy: new Types.ObjectId(userId),
    createdByRole: { $in: ["customer", "CUSTOMER"] },
  };
};

const ensureActiveSociety = async (societyId: string) => {
  if (!Types.ObjectId.isValid(societyId)) {
    throw new Error("Invalid Society ID");
  }

  const society = await Society.findOne({
    _id: societyId,
    isDeleted: { $ne: true },
  });

  if (!society) {
    throw new Error("Society not found or deleted");
  }
};

const normalizePayload = (payload: TFlatPayload) => {
  const normalized = { ...payload };

  if (normalized.flatNumber) {
    normalized.flatNumber = normalized.flatNumber.trim().toUpperCase();
  }

  if (normalized.block !== undefined) {
    normalized.block = normalized.block.trim();
  }

  return normalized;
};

const createFlat = async (
  payload: TFlatPayload,
  userId: string,
  userRole: TCreatorRole
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const normalized = normalizePayload(payload);

  if (!normalized.societyId) {
    throw new Error("Society is required");
  }

  await ensureActiveSociety(normalized.societyId);

  const isAdmin = isAdminRole(userRole);

  return Flat.create({
    ...normalized,
    createdBy: new Types.ObjectId(userId),
    createdByRole: isAdmin ? "admin" : "CUSTOMER",
    verificationStatus: isAdmin ? "VERIFIED" : "PENDING",
    verifiedBy: isAdmin ? new Types.ObjectId(userId) : null,
    verifiedAt: isAdmin ? new Date() : null,
    verificationNote: "",
    isDeleted: false,
  });
};

const getAllFlats = async (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {
    isDeleted: false,
  };

  if (typeof query.societyId === "string" && query.societyId) {
    if (!Types.ObjectId.isValid(query.societyId)) {
      throw new Error("Invalid Society ID");
    }

    filter.societyId = query.societyId;
  }

  if (
    typeof query.status === "string" &&
    ["Available", "Occupied", "Maintenance"].includes(query.status)
  ) {
    filter.status = query.status;
  }

  if (
    typeof query.verificationStatus === "string" &&
    ["PENDING", "VERIFIED", "REJECTED"].includes(
      query.verificationStatus
    )
  ) {
    filter.verificationStatus = query.verificationStatus;
  }

  if (typeof query.block === "string" && query.block.trim()) {
    filter.block = {
      $regex: query.block.trim(),
      $options: "i",
    };
  }

  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim();

    filter.$or = [
      { flatNumber: { $regex: search, $options: "i" } },
      { block: { $regex: search, $options: "i" } },
      { flatType: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return Flat.find(filter)
    .populate("societyId", "name city")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email")
    .sort({ createdAt: -1 });
};

const getMyFlats = async (customerId: string) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  return Flat.find({
    createdBy: new Types.ObjectId(customerId),
    createdByRole: { $in: ["customer", "CUSTOMER"] },
    isDeleted: { $ne: true },
  })
    .populate("societyId", "name city")
    .populate("verifiedBy", "name email")
    .sort({ createdAt: -1 });
};

const getSingleFlat = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Flat ID");
  }

  const flat = await Flat.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("societyId", "name city address")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email");

  if (!flat) {
    throw new Error("Flat not found");
  }

  return flat;
};

const updateFlat = async (
  id: string,
  payload: TFlatPayload,
  userId: string,
  role: TCreatorRole,
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Flat ID");
  }

  const flat = await Flat.findOne({
    _id: id,
    isDeleted: false,
    ...ownerFilter(userId, role),
  });

  if (!flat) {
    throw new Error("Flat not found");
  }

  // Do not let editing a flat silently bypass verification.
  const normalized = normalizePayload(payload);

  if (normalized.societyId) {
    await ensureActiveSociety(normalized.societyId);
  }

  const updateData: Record<string, unknown> = { ...normalized };

  // If an admin edits a rejected/pending flat, it stays in its
  // existing verification state until the admin verifies it.
  delete updateData.verificationStatus;
  delete updateData.createdBy;
  delete updateData.createdByRole;
  delete updateData.verifiedBy;
  delete updateData.verifiedAt;
  delete updateData.verificationNote;
  delete updateData.isDeleted;

  return Flat.findOneAndUpdate(
    { _id: id, isDeleted: false, ...ownerFilter(userId, role) },
    updateData,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("societyId", "name city")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email");
};

const verifyFlat = async (id: string, adminId: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Flat ID");
  }

  if (!Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID");
  }

  const flat = await Flat.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!flat) {
    throw new Error("Flat not found");
  }

  if (flat.verificationStatus !== "PENDING") {
    throw new Error("Only pending flats can be verified");
  }

  return Flat.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
      verificationStatus: "PENDING",
    },
    {
      $set: {
        verificationStatus: "VERIFIED",
        verifiedBy: new Types.ObjectId(adminId),
        verifiedAt: new Date(),
        verificationNote: "",
      },
    },
    { new: true, runValidators: true }
  )
    .populate("societyId", "name city")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email");
};

const rejectFlat = async (
  id: string,
  adminId: string,
  verificationNote: string
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Flat ID");
  }

  if (!Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID");
  }

  const note = verificationNote?.trim();

  if (!note) {
    throw new Error("Rejection reason is required");
  }

  const flat = await Flat.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!flat) {
    throw new Error("Flat not found");
  }

  if (flat.verificationStatus !== "PENDING") {
    throw new Error("Only pending flats can be rejected");
  }

  return Flat.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
      verificationStatus: "PENDING",
    },
    {
      $set: {
        verificationStatus: "REJECTED",
        verifiedBy: new Types.ObjectId(adminId),
        verifiedAt: null,
        verificationNote: note,
      },
    },
    { new: true, runValidators: true }
  )
    .populate("societyId", "name city")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email");
};

const deleteFlat = async (
  id: string,
  userId: string,
  role: TCreatorRole,
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Flat ID");
  }

  const flat = await Flat.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
      ...ownerFilter(userId, role),
    },
    {
      $set: { isDeleted: true },
    },
    { new: true }
  );

  if (!flat) {
    throw new Error("Flat not found");
  }

  return flat;
};


const getVerifiedFlatsBySociety = async (societyId: string) => {
  if (!Types.ObjectId.isValid(societyId)) {
    throw new Error("Invalid Society ID");
  }

  // Society model uses "status", not "verificationStatus".
  const society = await Society.findOne({
    _id: societyId,
    isDeleted: { $ne: true },
    status: "VERIFIED",
  });

  if (!society) {
    throw new Error(
      "Verified society not found. Please check society status and ID."
    );
  }

  // Return only verified, non-deleted flats belonging
  // to the selected verified society.
  return Flat.find({
    societyId: society._id,
    verificationStatus: "VERIFIED",
    isDeleted: { $ne: true },
  })
    .populate("societyId", "name city")
    .sort({ flatNumber: 1 });
};


export const FlatServices = {
  createFlat,
  getAllFlats,
  getMyFlats,
  getSingleFlat,
  updateFlat,
  verifyFlat,
  rejectFlat,
  deleteFlat,
  getVerifiedFlatsBySociety
};
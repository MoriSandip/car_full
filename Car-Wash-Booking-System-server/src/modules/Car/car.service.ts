import { Types } from "mongoose";
import { Car } from "./car.model";
import Flat from "../Flat/flat.model";
import { Society } from "../Society/society.model";

type TCreatorRole = "ADMIN" | "admin" | "CUSTOMER";

type TCarPayload = {
  societyId?: string;
  flatId?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  registrationNumber?: string;
  make?: string;
  model?: string;
  color?: string;
  imageUrl?: string;
  carType?: "Hatchback" | "Sedan" | "SUV" | "MUV" | "Luxury" | "Other";
  parkingSlot?: string;
  status?: "Active" | "Inactive" | "Maintenance";
  description?: string;
};

const isAdminRole = (role: string) =>
  role === "ADMIN" || role === "admin";

const validateObjectId = (id: string, label: string) => {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label} ID`);
  }
};

const normalizePayload = (payload: TCarPayload) => {
  const normalized = { ...payload };

  if (normalized.registrationNumber) {
    normalized.registrationNumber =
      normalized.registrationNumber.trim().toUpperCase();
  }

  if (normalized.ownerName) {
    normalized.ownerName = normalized.ownerName.trim();
  }

  if (normalized.ownerPhone) {
    normalized.ownerPhone = normalized.ownerPhone.trim();
  }

  if (normalized.ownerEmail) {
    normalized.ownerEmail = normalized.ownerEmail.trim().toLowerCase();
  }

  if (normalized.make) {
    normalized.make = normalized.make.trim();
  }

  if (normalized.model) {
    normalized.model = normalized.model.trim();
  }

  if (normalized.color) {
    normalized.color = normalized.color.trim();
  }

  if (normalized.imageUrl) {
    normalized.imageUrl = normalized.imageUrl.trim();
  }

  if (normalized.parkingSlot) {
    normalized.parkingSlot = normalized.parkingSlot.trim();
  }

  if (normalized.description) {
    normalized.description = normalized.description.trim();
  }

  return normalized;
};

const ensureSocietyAndFlat = async (
  societyId: string,
  flatId: string,
  role: TCreatorRole,
) => {
  validateObjectId(societyId, "Society");
  validateObjectId(flatId, "Flat");

  const society = await Society.findOne({
    _id: societyId,
    isDeleted: { $ne: true },
  });

  if (!society) {
    throw new Error("Society not found or deleted");
  }
  if (society.status !== "VERIFIED") {
    throw new Error("Selected Society is not verified by admin yet");
  }

  const flat = await Flat.findOne({
    _id: flatId,
    societyId,
    isDeleted: { $ne: true },
  });

  if (!flat) {
    throw new Error("Flat not found in selected Society");
  }

  if (
    role === "CUSTOMER" &&
    flat.verificationStatus !== "VERIFIED"
  ) {
    throw new Error("Selected Flat is not verified by admin yet");
  }
};

const populateCar = (query: any) =>
  query
    .populate("societyId", "name city")
    .populate("flatId", "flatNumber block floorNumber")
    .populate("createdBy", "name email")
    .populate("verifiedBy", "name email");

/**
 * CREATE CAR
 *
 * One customer can add multiple cars.
 * Every active car must have a unique registration number.
 */
const createCar = async (
  payload: TCarPayload,
  userId: string,
  userRole: TCreatorRole,
) => {
  validateObjectId(userId, "User");

  const normalized = normalizePayload(payload);

  if (!normalized.societyId || !normalized.flatId) {
    throw new Error("Society and Flat are required");
  }

  await ensureSocietyAndFlat(
    normalized.societyId,
    normalized.flatId,
    userRole,
  );

  const registrationNumber = normalized.registrationNumber;

  if (!registrationNumber) {
    throw new Error("Registration number is required");
  }

  // Duplicate check is based ONLY on registration number.
  // It does not restrict the number of cars owned by a customer.
  const duplicate = await Car.findOne({
    registrationNumber,
    isDeleted: { $ne: true },
  }).select("_id registrationNumber");

  if (duplicate) {
    throw new Error(
      `Registration number ${registrationNumber} is already registered`,
    );
  }

  const isAdmin = isAdminRole(userRole);

  const car = await Car.create({
    ...normalized,

    // Never trust creator/approval fields from the request body.
    createdBy: new Types.ObjectId(userId),
    createdByRole: isAdmin ? "admin" : "CUSTOMER",

    verificationStatus: isAdmin ? "VERIFIED" : "PENDING",
    verifiedBy: isAdmin ? new Types.ObjectId(userId) : null,
    verifiedAt: isAdmin ? new Date() : null,
    verificationNote: "",

    isDeleted: false,
  });

  return populateCar(Car.findById(car._id));
};

/**
 * GET ALL CARS
 */
const getAllCars = async (query: Record<string, unknown>) => {
  const filter: Record<string, any> = {
    isDeleted: false,
  };

  if (typeof query.societyId === "string" && query.societyId) {
    validateObjectId(query.societyId, "Society");
    filter.societyId = query.societyId;
  }

  if (typeof query.flatId === "string" && query.flatId) {
    validateObjectId(query.flatId, "Flat");
    filter.flatId = query.flatId;
  }

  if (
    typeof query.status === "string" &&
    ["Active", "Inactive", "Maintenance"].includes(query.status)
  ) {
    filter.status = query.status;
  }

  if (
    typeof query.verificationStatus === "string" &&
    ["PENDING", "VERIFIED", "REJECTED"].includes(
      query.verificationStatus,
    )
  ) {
    filter.verificationStatus = query.verificationStatus;
  }

  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim();

    filter.$or = [
      { ownerName: { $regex: search, $options: "i" } },
      { ownerPhone: { $regex: search, $options: "i" } },
      { registrationNumber: { $regex: search, $options: "i" } },
      { make: { $regex: search, $options: "i" } },
      { model: { $regex: search, $options: "i" } },
      { color: { $regex: search, $options: "i" } },
      { parkingSlot: { $regex: search, $options: "i" } },
    ];
  }

  return populateCar(
    Car.find(filter).sort({ createdAt: -1 }),
  );
};

/**
 * GET LOGGED-IN CUSTOMER'S CARS
 */
const getMyCars = async (userId: string) => {
  validateObjectId(userId, "User");

  return populateCar(
    Car.find({
      createdBy: new Types.ObjectId(userId),
      createdByRole: "CUSTOMER",
      isDeleted: false,
    }).sort({ createdAt: -1 }),
  );
};

/**
 * GET SINGLE CAR
 */
const getSingleCar = async (
  id: string,
  userId: string,
  role: TCreatorRole,
) => {
  validateObjectId(id, "Car");

  const filter: Record<string, unknown> = {
    _id: id,
    isDeleted: false,
  };

  if (role === "CUSTOMER") {
    validateObjectId(userId, "User");

    filter.createdBy = new Types.ObjectId(userId);
    filter.createdByRole = "CUSTOMER";
  }

  const car = await populateCar(Car.findOne(filter));

  if (!car) {
    throw new Error("Car not found");
  }

  return car;
};

/**
 * UPDATE CAR
 */
const updateCar = async (
  id: string,
  payload: TCarPayload,
  userId: string,
  role: TCreatorRole,
) => {
  validateObjectId(id, "Car");
  validateObjectId(userId, "User");

  const filter: Record<string, unknown> = {
    _id: id,
    isDeleted: false,
  };

  if (role === "CUSTOMER") {
    filter.createdBy = new Types.ObjectId(userId);
    filter.createdByRole = "CUSTOMER";
  }

  const existingCar = await Car.findOne(filter);

  if (!existingCar) {
    throw new Error("Car not found");
  }

  if (
    role === "CUSTOMER" &&
    existingCar.verificationStatus === "VERIFIED"
  ) {
    throw new Error("Verified car cannot be edited. Contact admin");
  }

  const normalized = normalizePayload(payload);

  const societyId =
    normalized.societyId || String(existingCar.societyId);

  const flatId =
    normalized.flatId || String(existingCar.flatId);

  await ensureSocietyAndFlat(societyId, flatId, role);

  // Check duplicate only if a registration number is supplied.
  if (normalized.registrationNumber) {
    const registrationNumber = normalized.registrationNumber;

    const duplicate = await Car.findOne({
      _id: { $ne: existingCar._id },
      registrationNumber,
      isDeleted: { $ne: true },
    }).select("_id registrationNumber");

    if (duplicate) {
      throw new Error(
        `Registration number ${registrationNumber} is already registered`,
      );
    }
  }

  const updateData: Record<string, unknown> = {
    ...normalized,
  };

  // These fields must never be controlled by the request body.
  delete updateData.createdBy;
  delete updateData.createdByRole;
  delete updateData.verificationStatus;
  delete updateData.verifiedBy;
  delete updateData.verifiedAt;
  delete updateData.verificationNote;
  delete updateData.isDeleted;

  // Customer edits require admin re-verification.
  if (role === "CUSTOMER") {
    updateData.verificationStatus = "PENDING";
    updateData.verifiedBy = null;
    updateData.verifiedAt = null;
    updateData.verificationNote = "";
  }

  return populateCar(
    Car.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true },
    ),
  );
};

/**
 * ADMIN VERIFIES CAR
 */
const verifyCar = async (id: string, adminId: string) => {
  validateObjectId(id, "Car");
  validateObjectId(adminId, "Admin");

  const car = await Car.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!car) {
    throw new Error("Car not found");
  }

  if (car.verificationStatus !== "PENDING") {
    throw new Error("Only pending cars can be verified");
  }

  return populateCar(
    Car.findOneAndUpdate(
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
      { new: true, runValidators: true },
    ),
  );
};

/**
 * ADMIN REJECTS CAR
 */
const rejectCar = async (
  id: string,
  adminId: string,
  verificationNote: string,
) => {
  validateObjectId(id, "Car");
  validateObjectId(adminId, "Admin");

  const note = verificationNote?.trim();

  if (!note) {
    throw new Error("Rejection reason is required");
  }

  const car = await Car.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!car) {
    throw new Error("Car not found");
  }

  if (car.verificationStatus !== "PENDING") {
    throw new Error("Only pending cars can be rejected");
  }

  return populateCar(
    Car.findOneAndUpdate(
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
      { new: true, runValidators: true },
    ),
  );
};

/**
 * DELETE CAR (SOFT DELETE)
 */
const deleteCar = async (
  id: string,
  userId: string,
  role: TCreatorRole,
) => {
  validateObjectId(id, "Car");

  const filter: Record<string, unknown> = {
    _id: id,
    isDeleted: false,
  };

  if (role === "CUSTOMER") {
    validateObjectId(userId, "User");
    filter.createdBy = new Types.ObjectId(userId);
    filter.createdByRole = "CUSTOMER";
  }

  const car = await Car.findOneAndUpdate(
    filter,
    { $set: { isDeleted: true } },
    { new: true },
  );

  if (!car) {
    throw new Error("Car not found");
  }

  return car;
};

/**
 * CAR DASHBOARD STATS
 */
const getCarStats = async () => {
  const [
    total,
    pending,
    verified,
    rejected,
    active,
    inactive,
    maintenance,
  ] = await Promise.all([
    Car.countDocuments({ isDeleted: false }),

    Car.countDocuments({
      isDeleted: false,
      verificationStatus: "PENDING",
    }),

    Car.countDocuments({
      isDeleted: false,
      verificationStatus: "VERIFIED",
    }),

    Car.countDocuments({
      isDeleted: false,
      verificationStatus: "REJECTED",
    }),

    Car.countDocuments({
      isDeleted: false,
      status: "Active",
    }),

    Car.countDocuments({
      isDeleted: false,
      status: "Inactive",
    }),

    Car.countDocuments({
      isDeleted: false,
      status: "Maintenance",
    }),
  ]);

  return {
    total,
    pending,
    verified,
    rejected,
    active,
    inactive,
    maintenance,
  };
};

export const CarServices = {
  createCar,
  getAllCars,
  getMyCars,
  getSingleCar,
  updateCar,
  verifyCar,
  rejectCar,
  deleteCar,
  getCarStats,
};
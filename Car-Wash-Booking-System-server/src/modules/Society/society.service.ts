import httpStatus from "http-status";
import AppError from "../../app/errors/AppError";
import { TSociety } from "./society.interface";
import { Society } from "./society.model";

const createSocietyIntoDB = async (
  payload: TSociety,
  userRole: string,
  userId: string,
) => {
  const isAdmin = userRole === "admin" || userRole === "ADMIN";
  const isCustomer = userRole === "CUSTOMER";

  if (!isAdmin && !isCustomer) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only admin or customer can create a society",
    );
  }

  return Society.create({
    ...payload,

    // Never trust status sent by frontend.
    status: isAdmin ? "VERIFIED" : "PENDING",

    createdBy: userId,
    createdByRole: isAdmin ? "ADMIN" : "CUSTOMER",

    ...(isAdmin
      ? {
          verifiedBy: userId,
          verifiedAt: new Date(),
        }
      : {}),

    verificationNote: undefined,
    isDeleted: false,
  });
};

const getAllSocietyFromDB = async () => {
  const result = await Society.find({ isDeleted: { $ne: true } }).sort({
    createdAt: -1,
  });

  return {
    meta: {
      total: result.length,
    },
    result,
  };
};

const getSingleSocietyFromDB = async (id: string) => {
  const result = await Society.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Society not found");
  }

  return result;
};

const updateSocietyIntoDB = async (
  id: string,
  payload: Partial<TSociety>,
) => {
  const result = await Society.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    payload,
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Society not found");
  }

  return result;
};

const deleteSocietyFromDB = async (id: string) => {
  const result = await Society.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Society not found");
  }

  return result;
};
const getMySocietiesFromDB = async (customerId: string) => {
  return Society.find({
    createdBy: customerId,
    createdByRole: "CUSTOMER",
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 });
};

const verifySocietyIntoDB = async (
  id: string,
  adminId: string,
) => {
  const result = await Society.findOneAndUpdate(
    {
      _id: id,
      isDeleted: { $ne: true },
      status: "PENDING",
    },
    {
      $set: {
        status: "VERIFIED",
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
      $unset: {
        verificationNote: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Pending society not found",
    );
  }

  return result;
};

const rejectSocietyIntoDB = async (
  id: string,
  adminId: string,
  note: string,
) => {
  const result = await Society.findOneAndUpdate(
    {
      _id: id,
      isDeleted: { $ne: true },
      status: "PENDING",
    },
    {
      $set: {
        status: "REJECTED",
        verifiedBy: adminId,
        verifiedAt: new Date(),
        verificationNote: note,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Pending society not found",
    );
  }

  return result;
};
export const SocietyServices = {
  createSocietyIntoDB,
  getAllSocietyFromDB,
  getSingleSocietyFromDB,
  updateSocietyIntoDB,
  deleteSocietyFromDB,
  getMySocietiesFromDB,
  verifySocietyIntoDB,
  rejectSocietyIntoDB,
   
};
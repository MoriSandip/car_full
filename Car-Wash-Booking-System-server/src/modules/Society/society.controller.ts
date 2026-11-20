import httpStatus from "http-status";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import { SocietyServices } from "./society.service";
import AppError from "../../app/errors/AppError";
import { Society } from "./society.model";

const createSociety = catchAsync(async (req, res) => {
  const userRole = String(req.user?.role ?? "");
  const userId = String(
    userRole === "CUSTOMER"
      ? req.user?.sub ?? ""
      : req.user?.userId ?? "",
  );

  if (!userId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Creator ID missing from access token",
    );
  }

  const result = await SocietyServices.createSocietyIntoDB(
    req.body,
    userRole,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      result.status === "VERIFIED"
        ? "Society created and verified successfully"
        : "Society submitted successfully. Waiting for admin verification.",
    data: result,
  });
});

const getAllSociety = catchAsync(async (_req, res) => {
  const result = await SocietyServices.getAllSocietyFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Societies retrieved successfully",
    data: result,
  });
});

const getSingleSociety = catchAsync(async (req, res) => {
  const result = await SocietyServices.getSingleSocietyFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Society retrieved successfully",
    data: result,
  });
});

const updateSociety = catchAsync(async (req, res) => {
  const result = await SocietyServices.updateSocietyIntoDB(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Society updated successfully",
    data: result,
  });
});

const deleteSociety = catchAsync(async (req, res) => {
  const result = await SocietyServices.deleteSocietyFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Society deleted successfully",
    data: result,
  });
});

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
      $unset: { verificationNote: 1 },
    },
    { new: true, runValidators: true },
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
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Pending society not found",
    );
  }

  return result;
};

const getMySocieties = catchAsync(async (req, res) => {
  const customerId = String((req as any).user?.sub ?? "");

  if (!customerId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Customer ID missing from access token",
    );
  }

  const result =
    await SocietyServices.getMySocietiesFromDB(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your societies retrieved successfully",
    data: result,
  });
});

const verifySociety = catchAsync(async (req, res) => {
  const adminId = String(
    (req as any).user?.userId ??
      (req as any).user?.sub ??
      "",
  );

  if (!adminId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Admin ID missing from access token",
    );
  }

  const result = await SocietyServices.verifySocietyIntoDB(
    req.params.id,
    adminId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Society verified successfully",
    data: result,
  });
});

const rejectSociety = catchAsync(async (req, res) => {
  const adminId = String(
    (req as any).user?.userId ??
      (req as any).user?.sub ??
      "",
  );

  if (!adminId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Admin ID missing from access token",
    );
  }

  const note = String(req.body?.note ?? "").trim();

  if (!note) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Rejection reason is required",
    );
  }

  const result = await SocietyServices.rejectSocietyIntoDB(
    req.params.id,
    adminId,
    note,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Society rejected successfully",
    data: result,
  });
});

export const SocietyControllers = {
  createSociety,
  getAllSociety,
  getSingleSociety,
  updateSociety,
  deleteSociety,
  getMySocietiesFromDB,
verifySocietyIntoDB,
rejectSocietyIntoDB,
getMySocieties,
verifySociety,
rejectSociety,
};
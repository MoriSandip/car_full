import { Request, Response } from "express";
import { FlatServices } from "./flat.service";

type TAuthRequest = Request & {
  user?: {
    userId?: string;
    sub?: string;
    role?: string;
  };
};

const sendError = (res: Response, error: unknown) => {
  const err = error as Error & { code?: number };

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "This Flat Number already exists in the selected Society.",
    });
  }

  const message = err.message || "Something went wrong";

  const statusCode =
    /not found/i.test(message)
      ? 404
      : /invalid|required|cannot be negative|only pending/i.test(message)
        ? 400
        : 500;

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const getAuthenticatedUser = (req: Request) => {
  const authReq = req as TAuthRequest;
  const role = String(authReq.user?.role ?? "");

  const userId = String(
    role === "CUSTOMER"
      ? authReq.user?.sub ?? authReq.user?.userId ?? ""
      : authReq.user?.userId ?? authReq.user?.sub ?? "",
  );

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const normalizedRole = role.toUpperCase();

  if (normalizedRole !== "ADMIN" && normalizedRole !== "CUSTOMER") {
    throw new Error("Invalid user role");
  }

  return {
    userId,
    role: normalizedRole as "ADMIN" | "CUSTOMER",
  };
};
const createFlat = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);

    const result = await FlatServices.createFlat(req.body, userId, role);

    return res.status(201).json({
      success: true,
      message:
        role === "ADMIN"
          ? "Flat created and verified successfully"
          : "Flat submitted successfully. Waiting for admin verification.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getAllFlats = async (req: Request, res: Response) => {
  try {
    const result = await FlatServices.getAllFlats(req.query);

    return res.status(200).json({
      success: true,
      message: "Flats fetched successfully",
      data: {
        result,
        total: result.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getMyFlats = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);

    const result = await FlatServices.getMyFlats(userId);

    return res.status(200).json({
      success: true,
      message: "Your flats fetched successfully",
      data: {
        result,
        total: result.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSingleFlat = async (req: Request, res: Response) => {
  try {
    const result = await FlatServices.getSingleFlat(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Flat fetched successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateFlat = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);
    const result = await FlatServices.updateFlat(
      req.params.id,
      req.body,
      userId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: "Flat updated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const verifyFlat = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);

    const result = await FlatServices.verifyFlat(
      req.params.id,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Flat verified successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const rejectFlat = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);

    const result = await FlatServices.rejectFlat(
      req.params.id,
      userId,
      req.body.verificationNote
    );

    return res.status(200).json({
      success: true,
      message: "Flat rejected successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteFlat = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);
    const result = await FlatServices.deleteFlat(
      req.params.id,
      userId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: "Flat deleted successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getVerifiedFlatsBySociety = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await FlatServices.getVerifiedFlatsBySociety(
      req.params.societyId,
    );

    return res.status(200).json({
      success: true,
      message: "Verified flats fetched successfully",
      data: {
        result,
        total: result.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const FlatControllers = {
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
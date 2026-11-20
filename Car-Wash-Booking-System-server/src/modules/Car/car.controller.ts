import { Request, Response } from "express";
import { CarServices } from "./car.service";

type TAuthRequest = Request & {
  user?: {
    userId?: string;
    sub?: string;
    role?: string;
  };
};

const getAuthenticatedUser = (req: Request) => {
  const authReq = req as TAuthRequest;
  const role = String(authReq.user?.role ?? "").toUpperCase();

  const userId = String(
    role === "CUSTOMER"
      ? authReq.user?.sub ?? authReq.user?.userId ?? ""
      : authReq.user?.userId ?? authReq.user?.sub ?? "",
  );

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  if (role !== "ADMIN" && role !== "CUSTOMER") {
    throw new Error("Invalid user role");
  }

  return {
    userId,
    role: role as "ADMIN" | "CUSTOMER",
  };
};

const sendError = (res: Response, error: unknown) => {
  const err = error as Error & { code?: number };

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This registration number already exists.",
    });
  }

  const message = err.message || "Something went wrong";

  const statusCode =
    /not found/i.test(message)
      ? 404
      : /invalid|required|cannot|only pending|already exists|not verified/i.test(
            message,
          )
        ? 400
        : /authenticated|user id|admin id/i.test(message)
          ? 401
          : 500;

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const createCar = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);

    const result = await CarServices.createCar(
      req.body,
      userId,
      role,
    );

    return res.status(201).json({
      success: true,
      message:
        role === "ADMIN"
          ? "Car created and verified successfully"
          : "Car submitted successfully. Waiting for admin verification.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getAllCars = async (req: Request, res: Response) => {
  try {
    const result = await CarServices.getAllCars(req.query);

    return res.status(200).json({
      success: true,
      message: "Cars fetched successfully",
      data: {
        result,
        total: result.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getMyCars = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);
    const result = await CarServices.getMyCars(userId);

    return res.status(200).json({
      success: true,
      message: "Your cars fetched successfully",
      data: {
        result,
        total: result.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getCarStats = async (_req: Request, res: Response) => {
  try {
    const result = await CarServices.getCarStats();

    return res.status(200).json({
      success: true,
      message: "Car stats fetched successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSingleCar = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);

    const result = await CarServices.getSingleCar(
      req.params.id,
      userId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: "Car fetched successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCar = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);

    const result = await CarServices.updateCar(
      req.params.id,
      req.body,
      userId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: "Car updated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const verifyCar = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);

    const result = await CarServices.verifyCar(
      req.params.id,
      userId,
    );

    return res.status(200).json({
      success: true,
      message: "Car verified successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const rejectCar = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthenticatedUser(req);

    const result = await CarServices.rejectCar(
      req.params.id,
      userId,
      req.body.verificationNote,
    );

    return res.status(200).json({
      success: true,
      message: "Car rejected successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteCar = async (req: Request, res: Response) => {
  try {
    const { userId, role } = getAuthenticatedUser(req);

    const result = await CarServices.deleteCar(
      req.params.id,
      userId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const CarControllers = {
  createCar,
  getAllCars,
  getMyCars,
  getCarStats,
  getSingleCar,
  updateCar,
  verifyCar,
  rejectCar,
  deleteCar,
};
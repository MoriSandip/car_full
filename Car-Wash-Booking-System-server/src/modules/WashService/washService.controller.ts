
import { Request, Response } from "express";
import httpStatus from "http-status";  
import { WashServiceService } from "./washService.service";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await WashServiceService.createWashService(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Wash service created successfully",
    data: result,
  });
});

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await WashServiceService.getWashServices({
    searchTerm: String(req.query.searchTerm ?? ""),
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    status: req.query.status
      ? String(req.query.status)
      : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wash services retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const stats = catchAsync(async (_req: Request, res: Response) => {
  const result = await WashServiceService.getWashServiceStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wash service statistics retrieved successfully",
    data: result,
  });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await WashServiceService.getWashServiceById(
    req.params.id
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wash service retrieved successfully",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await WashServiceService.updateWashService(
    req.params.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wash service updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await WashServiceService.deleteWashService(
    req.params.id
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wash service deleted successfully",
    data: result,
  });
});

export const WashServiceController = {
  create,
  list,
  stats,
  getOne,
  update,
  remove,
};

import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import {
  reportAnalyticsQuerySchema,
  reportBookingsQuerySchema,
} from "./report.validation";
import { ReportService } from "./report.service";

const analytics = catchAsync(async (req: Request, res: Response) => {
  const filters = reportAnalyticsQuerySchema.parse(req.query);
  const result = await ReportService.getAnalytics(filters);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reports and analytics retrieved successfully.",
    data: result,
  });
});

const bookings = catchAsync(async (req: Request, res: Response) => {
  const filters = reportBookingsQuerySchema.parse(req.query);
  const result = await ReportService.getBookings(filters);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking report retrieved successfully.",
    data: result,
  });
});

export const ReportController = { analytics, bookings };
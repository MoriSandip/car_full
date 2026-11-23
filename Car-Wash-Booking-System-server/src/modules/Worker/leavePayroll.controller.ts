import { Request } from "express";
import httpStatus from "http-status";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import { LeavePayrollServices } from "./leavePayroll.service";

const currentWorkerId = (req: Request) =>
  String(req.user?.sub ?? "");
const currentAdminId = (req: Request) =>
  String(req.user?.sub ?? req.user?.userId ?? req.user?._id ?? "");

const createLeave = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.createLeaveRequest(currentWorkerId(req), req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Leave request submitted.", data });
});

const getLeaves = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.listLeaves(
    req.user?.role === "WORKER" ? currentWorkerId(req) : undefined,
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Leave requests retrieved.", data });
});

const cancelLeave = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.cancelLeave(currentWorkerId(req), req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Leave request cancelled.", data });
});

const reviewLeave = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.reviewLeave(req.params.id, currentAdminId(req), req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: `Leave ${data.status.toLowerCase()}.`, data });
});

const generatePayroll = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.generatePayroll(
    currentAdminId(req),
    req.body.periodStart,
    req.body.periodEnd,
  );
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Payroll generated.", data });
});

const getPayroll = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.listPayroll(
    req.user?.role === "WORKER" ? currentWorkerId(req) : undefined,
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payroll records retrieved.", data });
});

const updatePayroll = catchAsync(async (req, res) => {
  const data = await LeavePayrollServices.updatePayroll(req.params.id, currentAdminId(req), req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: `Payroll ${data.status.toLowerCase()}.`, data });
});

export const LeavePayrollControllers = {
  createLeave,
  getLeaves,
  cancelLeave,
  reviewLeave,
  generatePayroll,
  getPayroll,
  updatePayroll,
};

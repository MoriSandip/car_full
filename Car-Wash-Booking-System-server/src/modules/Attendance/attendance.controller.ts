import { Request } from 'express';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../app/errors/AppError';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import { AttendanceServices } from './attendance.service';

const getWorkerId = (req: Request) => {
  const workerId = (req as Request & { worker?: { _id: Types.ObjectId } })
    .worker?._id;
  if (!workerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authenticated worker not found.');
  }
  return workerId.toString();
};

const getMyAttendance = catchAsync(async (req, res) => {
  const workerId = getWorkerId(req);
  const attendance = await AttendanceServices.getMyAttendance(workerId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Today’s attendance retrieved successfully',
    data: attendance,
  });
});

const getMyAttendanceHistory = catchAsync(async (req, res) => {
  const history = await AttendanceServices.getMyAttendanceHistory(
    getWorkerId(req),
    req.query.page,
    req.query.limit,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Your attendance history retrieved successfully',
    data: history,
  });
});

const punchIn = catchAsync(async (req, res) => {
  const attendance = await AttendanceServices.punchIn(
    getWorkerId(req),
    req.body.selfie,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Punched in successfully',
    data: attendance,
  });
});

const punchOut = catchAsync(async (req, res) => {
  const attendance = await AttendanceServices.punchOut(
    getWorkerId(req),
    req.body.selfie,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Punched out successfully',
    data: attendance,
  });
});

const getDailyReport = catchAsync(async (req, res) => {
  const report = await AttendanceServices.getDailyReport(
    req.query.date,
    req.query.workerId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Daily attendance report retrieved successfully',
    data: report,
  });
});

export const AttendanceControllers = {
  getMyAttendance,
  getMyAttendanceHistory,
  punchIn,
  punchOut,
  getDailyReport,
};

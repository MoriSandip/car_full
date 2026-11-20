
import { Request, Response } from 'express';
import httpStatus from 'http-status';

import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import { WorkerServices } from './worker.service';
import jwt from 'jsonwebtoken';
import config from '../../app/config';

const createWorker = catchAsync(async (req, res) => {
  const worker = await WorkerServices.createWorkerIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Worker Registered Successfully',
    data: worker,
  });
});

const getAllWorkers = catchAsync(async (req, res) => {
  const result = await WorkerServices.getAllWorkersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Workers Retrieved Successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getWorkerStats = catchAsync(async (_req, res) => {
  const result = await WorkerServices.getWorkerStatsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Worker statistics retrieved successfully',
    data: result,
  });
});

const getSingleWorker = catchAsync(async (req, res) => {
  const worker = await WorkerServices.getSingleWorkerFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Worker Retrieved Successfully',
    data: worker,
  });
});

const updateWorker = catchAsync(async (req, res) => {
  const worker = await WorkerServices.updateWorkerInDB(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Worker Updated Successfully',
    data: worker,
  });
});

const deleteWorker = catchAsync(async (req, res) => {
  const worker = await WorkerServices.deleteWorkerFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Worker Deleted Successfully',
    data: worker,
  });
});

const workerLogin = catchAsync(async (req, res) => {
  const worker = await WorkerServices.workerLoginFromDB(
    String(req.body.email ?? ''),
    String(req.body.password ?? ''),
  );
  const accessToken = jwt.sign(
    {
      sub: String(worker._id),
      role: 'WORKER',
      email: worker.email,
    },
    config.jwt_access_secret as string,
    { expiresIn: config.jwt_access_expires_in || '1d' },
  );
  const { password: _password, ...workerData } = worker.toObject();
  void _password;

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Login successful.',
    data: { accessToken, worker: workerData, role: 'WORKER' },
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const workerId = (req as any).worker?._id;

  if (!workerId) {
    throw new Error('Authenticated worker not found');
  }

  const worker = await WorkerServices.getSingleWorkerFromDB(
    String(workerId),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Worker Profile Retrieved Successfully',
    data: worker,
  });
});

const getWorkerDashboard = catchAsync(
  async (req: Request, res: Response) => {
    // auth middleware sets req.worker for a verified WORKER token.
    const workerId =
      (req as any).worker?._id ??
      (req as any).user?.sub;

    if (!workerId) {
      throw new Error('Authenticated worker ID not found');
    }

    const result = await WorkerServices.getWorkerDashboard(
      String(workerId),
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Worker dashboard retrieved successfully',
      data: result,
    });
  },
);


const getAssignedBookings = catchAsync(async (req, res) => {
  const workerId =
    (req as any).worker?._id ??
    (req as any).user?.sub;

  if (!workerId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'Authenticated worker ID not found',
      data: null,
    });
  }

  const result = await WorkerServices.getAssignedBookingsFromDB(
    String(workerId),
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assigned bookings retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getMyCashTransactions = catchAsync(async (req, res) => {
  const workerId = (req as any).worker?._id ?? (req as any).user?.sub;
  if (!workerId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'Authenticated worker ID not found',
      data: null,
    });
  }
  const result = await WorkerServices.getMyCashTransactionsFromDB(
    String(workerId),
    {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status
        ? String(req.query.status) as 'Pending' | 'Paid' | 'Failed' | 'Refunded'
        : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your cash transactions were retrieved successfully',
    data: result.data,
    meta: {...result.meta, summary: result.summary},
  });
});


const updateAssignedBookingWork = catchAsync(async (req, res) => {
  const workerId = (req as any).worker?._id;

  const action = String(req.body.action || "");
  const cashReceived = req.body.cashReceived;

  if (!["start", "stop", "resume", "done"].includes(action)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Action must be start, stop, resume, or done",
      data: null,
    });
  }
  if (
    (cashReceived !== undefined && typeof cashReceived !== 'boolean') ||
    (cashReceived !== undefined && action !== 'done')
  ) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'cashReceived must be a boolean provided only when completing work',
      data: null,
    });
  }

  const result = await WorkerServices.updateAssignedBookingWork(
    String(workerId || ""),
    req.params.id,
    action as "start" | "stop" | "resume" | "done",
    cashReceived,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Work action '${action}' completed successfully`,
    data: result,
  });
});

const updateAssignedBookingProgress = catchAsync(async (req, res) => {
  const workerId = (req as any).worker?._id;
  const result = await WorkerServices.updateAssignedBookingProgress(
    String(workerId || ''),
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cleaning progress updated successfully',
    data: result,
  });
});

export const WorkerControllers = {
  createWorker,
  getAllWorkers,
  getWorkerStats,
  getSingleWorker,
  updateWorker,
  deleteWorker,
  workerLogin,
  getMyProfile,
  getWorkerDashboard,
  getAssignedBookings,
  getMyCashTransactions,
  updateAssignedBookingWork,
  updateAssignedBookingProgress,
};

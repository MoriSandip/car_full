
import { Request, Response } from "express";
import httpStatus from "http-status"; 
import { BookingService } from "./booking.service";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";

const bookingListParams = (req: Request, customerId?: string) => ({
  searchTerm: String(req.query.searchTerm ?? ""),
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 10,
  status: req.query.status ? String(req.query.status) : undefined,
  paymentType: req.query.paymentType
    ? String(req.query.paymentType)
    : undefined,
  societyId: req.query.societyId ? String(req.query.societyId) : undefined,
  from: req.query.from ? String(req.query.from) : undefined,
  to: req.query.to ? String(req.query.to) : undefined,
  toExclusive: req.query.toExclusive
    ? String(req.query.toExclusive)
    : undefined,
  customerId,
});

const create = catchAsync(async (req: Request, res: Response) => {
  const customerId =
    req.user?.role === "CUSTOMER" ? String(req.user.sub) : undefined;
  const result = await BookingService.createBooking({
    ...req.body,
    customerId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});

const list = catchAsync(async (req: Request, res: Response) => {
  const customerId =
    req.user?.role === "CUSTOMER" ? String(req.user.sub) : undefined;
  const result = await BookingService.getBookings(
    bookingListParams(req, customerId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bookings retrieved successfully",
    data: result,
  });
});

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingService.getBookings(
    bookingListParams(req, String(req.user.sub)),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your bookings retrieved successfully",
    data: result,
  });
});

const stats = catchAsync(async (_req: Request, res: Response) => {
  const result = await BookingService.getBookingStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking statistics retrieved successfully",
    data: result,
  });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const customerId =
    req.user?.role === "CUSTOMER" ? String(req.user.sub) : undefined;
  const result = await BookingService.getBookingById(
    req.params.id,
    customerId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking retrieved successfully",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const customerId =
    req.user?.role === "CUSTOMER" ? String(req.user.sub) : undefined;
  const result = await BookingService.updateBooking(
    req.params.id,
    req.body,
    customerId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking updated successfully",
    data: result,
  });
});

const submitReview = catchAsync(async (req: Request, res: Response) => {
  if (req.user?.role !== 'CUSTOMER') {
    throw new Error('Only customers can review bookings');
  }
  const result = await BookingService.submitBookingReview(
    req.params.id,
    String(req.user.sub),
    req.body.rating,
    req.body.review,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking review submitted successfully',
    data: result,
  });
});

const changeStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BookingService.changeBookingStatus(
      req.params.id,
      req.body
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking status updated successfully",
      data: result,
    });
  }
);

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingService.deleteBooking(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking deleted successfully",
    data: result,
  });
});

const assignWorker = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const adminId = user?.userId ?? user?._id ?? user?.id;

  if (!adminId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Authenticated admin ID not found",
      data: null,
    });
  }

  const result = await BookingService.assignWorkerToBooking(
    req.params.id,
    req.body.workerId,
    String(adminId)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Worker assigned successfully",
    data: result,
  });
});

const assignWorkerToMembershipBookings = catchAsync(
  async (req: Request, res: Response) => {
    const adminId =
      req.user?.userId ?? req.user?._id ?? req.user?.id;

    if (!adminId) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Authenticated admin ID not found",
        data: null,
      });
    }

    const result = await BookingService.assignWorkerToMembershipBookings(
      req.params.membershipId,
      req.body.workerId,
      String(adminId),
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `${result.assignedCount} upcoming membership wash(es) assigned successfully`,
      data: result,
    });
  },
);

const unassignWorkerFromMembershipBookings = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BookingService.unassignWorkerFromMembershipBookings(
      req.params.membershipId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Worker removed from membership; ${result.unassignedCount} upcoming wash(es) unassigned`,
      data: result,
    });
  },
);

const unassignWorker = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BookingService.unassignWorkerFromBooking(
      req.params.id
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Worker unassigned successfully",
      data: result,
    });
  }
);

export const BookingController = {
  create,
  list,
  listMine,
  stats,
  getOne,
  update,
  submitReview,
  changeStatus,
  remove,
  assignWorker,
  assignWorkerToMembershipBookings,
  unassignWorkerFromMembershipBookings,
  unassignWorker,
};

import { Types } from "mongoose";
import AppError from "../../app/errors/AppError";
import Booking from "../Booking/booking.model";
import Membership from "../Membership/membership.model";
import { Society } from "../Society/society.model";
import { PaymentTransaction } from "../payment/paymentTransaction.model";
import { Worker } from "../Worker/worker.model";

type TReportFilters = {
  from: string;
  to: string;
  societyId?: string;
};

type TBookingFilters = TReportFilters & {
  page: number;
  limit: number;
};

const parseDateRange = ({ from, to, societyId }: TReportFilters) => {
  const start = new Date(`${from}T00:00:00.000Z`);
  const endExclusive = new Date(`${to}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) {
    throw new AppError(400, "Report dates are invalid.");
  }
  if (societyId && !Types.ObjectId.isValid(societyId)) {
    throw new AppError(400, "Society ID is invalid.");
  }
  return {
    start,
    endExclusive,
    societyObjectId: societyId ? new Types.ObjectId(societyId) : undefined,
  };
};

const bookingMatch = (
  start: Date,
  endExclusive: Date,
  societyObjectId?: Types.ObjectId,
) => ({
  isDeleted: { $ne: true },
  bookingDate: { $gte: start, $lt: endExclusive },
  ...(societyObjectId ? { societyId: societyObjectId } : {}),
});

const transactionPipeline = (
  start: Date,
  endExclusive: Date,
  societyObjectId?: Types.ObjectId,
) => [
  {
    $match: {
      createdAt: { $gte: start, $lt: endExclusive },
      status: { $in: ["Paid", "Refunded"] },
    },
  },
  {
    $lookup: {
      from: Booking.collection.name,
      localField: "bookingId",
      foreignField: "_id",
      as: "booking",
    },
  },
  {
    $lookup: {
      from: Membership.collection.name,
      localField: "membershipId",
      foreignField: "_id",
      as: "membership",
    },
  },
  {
    $addFields: {
      reportSocietyId: {
        $ifNull: [
          { $arrayElemAt: ["$booking.societyId", 0] },
          { $arrayElemAt: ["$membership.societyId", 0] },
        ],
      },
    },
  },
  ...(societyObjectId
    ? [{ $match: { reportSocietyId: societyObjectId } }]
    : []),
];

const getAnalytics = async (filters: TReportFilters) => {
  const { start, endExclusive, societyObjectId } = parseDateRange(filters);
  const match = bookingMatch(start, endExclusive, societyObjectId);
  const revenuePipeline = transactionPipeline(
    start,
    endExclusive,
    societyObjectId,
  );

  const [
    [bookingSummary],
    dailyBookings,
    servicePerformance,
    societyPerformance,
    workerPerformance,
    [paymentSummary],
    paymentMethods,
    dailyRevenue,
    revenueByType,
  ] = await Promise.all([
    Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ["$status", "Confirmed"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "InProgress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          paidBookingValue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amountPayable",
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$bookingDate",
              timezone: "UTC",
            },
          },
          bookings: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", bookings: 1, completed: 1 } },
    ]),
    Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$serviceNameSnapshot",
          bookings: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amountPayable",
                0,
              ],
            },
          },
        },
      },
      { $sort: { bookings: -1, _id: 1 } },
      { $project: { _id: 0, service: "$_id", bookings: 1, completed: 1, paidAmount: 1 } },
    ]),
    Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$societyId",
          bookings: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amountPayable",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: Society.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "society",
        },
      },
      { $unwind: { path: "$society", preserveNullAndEmptyArrays: true } },
      { $sort: { bookings: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          societyId: "$_id",
          society: { $ifNull: ["$society.name", "Unknown society"] },
          bookings: 1,
          completed: 1,
          paidAmount: 1,
        },
      },
    ]),
    Booking.aggregate([
      { $match: { ...match, workerId: { $ne: null } } },
      {
        $group: {
          _id: "$workerId",
          bookings: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          averageRating: { $avg: "$customerRating" },
          workingSeconds: { $sum: { $ifNull: ["$totalWorkingSeconds", 0] } },
        },
      },
      {
        $lookup: {
          from: Worker.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },
      { $sort: { completed: -1, bookings: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          workerId: "$_id",
          worker: { $ifNull: ["$worker.name", "Unknown worker"] },
          bookings: 1,
          completed: 1,
          averageRating: { $ifNull: ["$averageRating", 0] },
          workingSeconds: 1,
        },
      },
    ]),
    PaymentTransaction.aggregate([
      ...revenuePipeline,
      {
        $group: {
          _id: null,
          collected: {
            $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] },
          },
          refunded: {
            $sum: { $cond: [{ $eq: ["$status", "Refunded"] }, "$amount", 0] },
          },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]),
    PaymentTransaction.aggregate([
      ...revenuePipeline,
      { $match: { status: "Paid" } },
      {
        $group: {
          _id: "$provider",
          transactions: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1, _id: 1 } },
      { $project: { _id: 0, provider: "$_id", transactions: 1, amount: 1 } },
    ]),
    PaymentTransaction.aggregate([
      ...revenuePipeline,
      { $match: { status: "Paid" } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          amount: { $sum: "$amount" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", amount: 1, transactions: 1 } },
    ]),
    PaymentTransaction.aggregate([
      ...revenuePipeline,
      { $match: { status: "Paid" } },
      {
        $group: {
          _id: {
            $cond: [{ $ne: ["$bookingId", null] }, "Booking", "Membership"],
          },
          transactions: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1, _id: 1 } },
      { $project: { _id: 0, type: "$_id", transactions: 1, amount: 1 } },
    ]),
  ]);

  return {
    range: {
      from: filters.from,
      to: filters.to,
      societyId: filters.societyId ?? null,
    },
    summary: {
      totalBookings: bookingSummary?.total ?? 0,
      pendingBookings: bookingSummary?.pending ?? 0,
      confirmedBookings: bookingSummary?.confirmed ?? 0,
      inProgressBookings: bookingSummary?.inProgress ?? 0,
      completedBookings: bookingSummary?.completed ?? 0,
      cancelledBookings: bookingSummary?.cancelled ?? 0,
      paidBookingValue: bookingSummary?.paidBookingValue ?? 0,
      collectedRevenue: paymentSummary?.collected ?? 0,
      refundedAmount: paymentSummary?.refunded ?? 0,
      successfulPayments: paymentSummary?.paidCount ?? 0,
    },
    dailyBookings,
    dailyRevenue,
    servicePerformance,
    societyPerformance,
    workerPerformance,
    paymentMethods,
    revenueByType,
  };
};

const getBookings = async (filters: TBookingFilters) => {
  const { start, endExclusive, societyObjectId } = parseDateRange(filters);
  const query = bookingMatch(start, endExclusive, societyObjectId);
  const page = Math.max(1, Math.floor(filters.page));
  const limit = Math.min(500, Math.max(1, Math.floor(filters.limit)));
  const [data, total] = await Promise.all([
    Booking.find(query)
      .select(
        "bookingDate bookingTime status paymentStatus paymentMethod paymentType amountPayable serviceNameSnapshot societyId workerId carId",
      )
      .populate("societyId", "name")
      .populate("workerId", "name")
      .populate("carId", "registrationNumber")
      .sort({ bookingDate: -1, bookingTime: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments(query),
  ]);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const ReportService = { getAnalytics, getBookings };
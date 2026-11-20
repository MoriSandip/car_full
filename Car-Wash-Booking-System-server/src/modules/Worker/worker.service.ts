
import mongoose, { Types } from 'mongoose';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { WorkerSearchableFields, WORKER_STATUS } from './worker.constant';
import { TWorker } from './worker.interface';
import { Worker } from './worker.model';
import Booking from '../Booking/booking.model';
import Membership from '../Membership/membership.model';
import { AttendanceServices } from '../Attendance/attendance.service';
import { getScheduledDateTime } from '../../app/utils/scheduledDateTime';
import AppError from '../../app/errors/AppError';
import { PaymentTransaction } from '../payment/paymentTransaction.model';
import { NotificationService } from '../Notification/notification.service';

const getIndiaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
};

const createWorkerIntoDB = async (payload: TWorker) => {
  const email = payload.email.toLowerCase().trim();

  const existingWorker = await Worker.findOne({ email });
  if (existingWorker) {
    throw new Error('Worker with this email already exists');
  }

  return Worker.create({
    ...payload,
    email,
    status: payload.status || WORKER_STATUS.ACTIVE,
  });
};

const getAllWorkersFromDB = async (query: Record<string, unknown>) => {
  const workerQuery = new QueryBuilder(
    Worker.find().select('-password'),
    query,
  )
    .search(WorkerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await workerQuery.modelQuery;
  const meta = await workerQuery.countTotal();

  return { meta, data };
};

const getWorkerStatsFromDB = async () => {
  const [total, active, inactive] = await Promise.all([
    Worker.countDocuments(),
    Worker.countDocuments({ status: 'ACTIVE' }),
    Worker.countDocuments({ status: 'INACTIVE' }),
  ]);

  return { total, active, inactive };
};

const getSingleWorkerFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid worker ID');
  }

  const worker = await Worker.findById(id).select('-password');

  if (!worker) throw new Error('Worker not found');

  return worker;
};

const updateWorkerInDB = async (
  id: string,
  payload: Partial<TWorker>,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid worker ID');
  }

  if (payload.email) payload.email = payload.email.toLowerCase().trim();

  const worker = await Worker.findById(id).select('+password');

  if (!worker) throw new Error('Worker not found');

  if (payload.email && payload.email !== worker.email) {
    const duplicate = await Worker.findOne({
      email: payload.email,
      _id: { $ne: id },
    });

    if (duplicate) throw new Error('Email already exists');
  }

  Object.assign(worker, payload);
  await worker.save();

  const result = worker.toObject() as Record<string, unknown>;
  delete result.password;

  return result;
};

const deleteWorkerFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid worker ID');
  }

  const worker = await Worker.findByIdAndDelete(id).select('-password');

  if (!worker) throw new Error('Worker not found');

  return worker;
};

const workerLoginFromDB = async (email: string, password: string) => {
  const worker = await Worker.isWorkerExistsByEmail(
    email.toLowerCase().trim(),
  );

  if (!worker) {
    throw new Error('Invalid email or password');
  }

  if (worker.status !== WORKER_STATUS.ACTIVE) {
    throw new Error('Worker account is inactive');
  }

  const isPasswordMatched = await Worker.isPasswordMatched(
    password,
    worker.password,
  );

  if (!isPasswordMatched) {
    throw new Error('Invalid email or password');
  }

  // Return Mongoose document; controller calls toObject()
  return worker;
};

const getWorkerDashboard = async (workerId: string) => {
  if (!Types.ObjectId.isValid(workerId)) {
    throw new Error("Invalid worker ID");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseFilter = {
    workerId: new Types.ObjectId(workerId),
    isDeleted: false,
  };

  const [
    assignedBookings,
    pendingJobs,
    completedJobs,
    todayJobs,
    recentBookings,
  ] = await Promise.all([
    Booking.countDocuments({
      ...baseFilter,
      status: { $ne: "Cancelled" },
    }),

    Booking.countDocuments({
      ...baseFilter,
      status: { $in: ["Pending", "Confirmed"] },
    }),

    Booking.countDocuments({
      ...baseFilter,
      status: "Completed",
    }),

    Booking.countDocuments({
      ...baseFilter,
      bookingDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: { $ne: "Cancelled" },
    }),

    Booking.find(baseFilter)
      .populate("societyId")
      .populate("flatId")
      .populate("carId")
      .populate("serviceId")
      .populate("membershipId", "includedWashes usedWashes reservedWashes")
      .sort({ bookingDate: -1, bookingTime: 1 })
      .limit(5)
      .lean(),
  ]);

  return {
    assignedBookings,
    pendingJobs,
    completedJobs,
    todayJobs,
    recentBookings,
  };
};



const getAssignedBookingsFromDB = async (
  workerId: string,
  query: Record<string, unknown>,
) => {
  if (!Types.ObjectId.isValid(workerId)) {
    throw new Error('Invalid worker ID');
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {
    workerId: new Types.ObjectId(workerId),
    isDeleted: false,
  };

  const allowedStatuses = [
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled',
  ];

  if (
    typeof query.status === 'string' &&
    query.status !== 'All' &&
    [...allowedStatuses, 'InProgress'].includes(query.status)
  ) {
    filter.status = query.status;
  }

  const dateFilter: Record<string, Date> = {};
  if (typeof query.from === 'string') {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) {
      throw new Error('Invalid schedule start date');
    }
    dateFilter.$gte = from;
  }
  if (typeof query.toExclusive === 'string') {
    const toExclusive = new Date(query.toExclusive);
    if (Number.isNaN(toExclusive.getTime())) {
      throw new Error('Invalid schedule end date');
    }
    dateFilter.$lt = toExclusive;
  }
  if (Object.keys(dateFilter).length) {
    filter.bookingDate = dateFilter;
  }

  const search =
    typeof query.search === 'string' ? query.search.trim() : '';

  if (search) {
    // Search booking ID if the supplied value is a valid ObjectId.
    if (Types.ObjectId.isValid(search)) {
      filter._id = new Types.ObjectId(search);
    } else {
      // Do not guess customer fields that may not exist in your schema.
      throw new Error(
        'Search by booking ID only, or add the customer field from your Booking schema.',
      );
    }
  }

  const [data, total] = await Promise.all([
    Booking.find(filter)
      .populate('societyId')
      .populate('flatId')
      .populate('carId')
      .populate('serviceId')
      .populate('membershipId', 'includedWashes usedWashes reservedWashes')
      .sort({ bookingDate: -1, bookingTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Booking.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

const getMyCashTransactionsFromDB = async (
  workerId: string,
  filters: {
    page?: number;
    limit?: number;
    status?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
    from?: string;
    to?: string;
  },
) => {
  if (!Types.ObjectId.isValid(workerId)) {
    throw new AppError(400, 'Invalid worker ID');
  }
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit) || 20)));
  const query: Record<string, unknown> = {
    provider: 'Cash',
    recordedByWorker: new Types.ObjectId(workerId),
  };
  if (filters.status) query.status = filters.status;
  const createdAt: Record<string, Date> = {};
  if (filters.from) {
    createdAt.$gte = new Date(`${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    const endDate = new Date(`${filters.to}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    createdAt.$lt = endDate;
  }
  if (Object.keys(createdAt).length) query.createdAt = createdAt;

  const [data, total, totals] = await Promise.all([
    PaymentTransaction.find(query)
      .populate({
        path: 'bookingId',
        select: 'bookingDate bookingTime serviceNameSnapshot status paymentType paymentMethod carId',
        populate: {path: 'carId', select: 'registrationNumber make model'},
      })
      .populate('customerId', 'name email phone')
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(limit),
    PaymentTransaction.countDocuments(query),
    PaymentTransaction.aggregate([
      {$match: query},
      {
        $group: {
          _id: null,
          transactionCount: {$sum: 1},
          paidCount: {$sum: {$cond: [{$eq: ['$status', 'Paid']}, 1, 0]}},
          paidAmount: {
            $sum: {$cond: [{$eq: ['$status', 'Paid']}, '$amount', 0]},
          },
          refundedAmount: {
            $sum: {$cond: [{$eq: ['$status', 'Refunded']}, '$amount', 0]},
          },
        },
      },
    ]),
  ]);
  return {
    data,
    summary: totals[0] ?? {
      transactionCount: 0,
      paidCount: 0,
      paidAmount: 0,
      refundedAmount: 0,
    },
    meta: {page, limit, total, totalPages: Math.ceil(total / limit)},
  };
};

type TWorkAction = "start" | "stop" | "resume" | "done";
type TCleaningProgress = {
  beforePhoto?: string;
  afterPhoto?: string;
  cleaningChecklist?: {
    exteriorWash: boolean;
    interiorCleaning: boolean;
    dashboard: boolean;
    tyreDressing: boolean;
    vacuumCleaning: boolean;
  };
  workerNotes?: string;
};

const updateAssignedBookingProgress = async (
  workerId: string,
  bookingId: string,
  progress: TCleaningProgress,
) => {
  if (!Types.ObjectId.isValid(workerId) || !Types.ObjectId.isValid(bookingId)) {
    throw new AppError(400, 'Invalid worker or booking ID');
  }

  const attendance = await AttendanceServices.getMyAttendance(workerId);
  if (!attendance || attendance.punchOutAt) {
    throw new AppError(400, 'Punch in before updating assigned work');
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    workerId: new Types.ObjectId(workerId),
    isDeleted: false,
  });
  if (!booking) throw new AppError(404, 'Assigned booking not found');
  if (getIndiaDateKey(booking.bookingDate) !== getIndiaDateKey(new Date())) {
    throw new AppError(400, 'Cleaning details can only be updated on the booking date');
  }
  const isWorkStarted = ['Working', 'Paused'].includes(
    booking.workStatus || 'NotStarted',
  );
  if (!isWorkStarted && Object.keys(progress).some(key => key !== 'beforePhoto')) {
    throw new AppError(400, 'Start work before updating cleaning details');
  }

  if (progress.beforePhoto !== undefined) booking.beforePhoto = progress.beforePhoto;
  if (progress.afterPhoto !== undefined) booking.afterPhoto = progress.afterPhoto;
  if (progress.cleaningChecklist) {
    booking.cleaningChecklist = progress.cleaningChecklist;
  }
  if (progress.workerNotes !== undefined) booking.workerNotes = progress.workerNotes;

  await booking.save();
  return booking;
};

const updateAssignedBookingWork = async (
  workerId: string,
  bookingId: string,
  action: TWorkAction,
  cashReceived?: boolean,
) => {
  if (!Types.ObjectId.isValid(workerId)) {
    throw new Error("Invalid worker ID");
  }

  if (!Types.ObjectId.isValid(bookingId)) {
    throw new Error("Invalid booking ID");
  }

  const attendance = await AttendanceServices.getMyAttendance(workerId);
  if (!attendance || attendance.punchOutAt) {
    throw new Error('Punch in before updating assigned work');
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    workerId: new Types.ObjectId(workerId),
    isDeleted: false,
  });

  if (!booking) {
    throw new Error("Assigned booking not found");
  }

  const now = new Date();
  const currentStatus = booking.workStatus || "NotStarted";
  const isUnpaidCashBooking =
    booking.paymentType === 'Individual' &&
    booking.paymentMethod === 'Cash' &&
    booking.paymentStatus !== 'Paid';
  let cashTransaction: InstanceType<typeof PaymentTransaction> | undefined;
  if (cashReceived !== undefined && !isUnpaidCashBooking) {
    throw new AppError(400, 'Cash collection status is not required for this booking');
  }
  const originalWorkState = {
    status: booking.status,
    workStatus: currentStatus,
    currentWorkStartedAt: booking.currentWorkStartedAt,
    workSessions: booking.workSessions.map((session) => ({
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
    })),
    totalWorkingSeconds: booking.totalWorkingSeconds,
    workCompletedAt: booking.workCompletedAt,
  };
  const restoreOriginalWorkState = () =>
    Booking.updateOne(
      { _id: booking._id, status: "Completed", workStatus: "Completed" },
      {
        $set: {
          status: originalWorkState.status,
          workStatus: originalWorkState.workStatus,
          currentWorkStartedAt: originalWorkState.currentWorkStartedAt,
          workSessions: originalWorkState.workSessions,
          totalWorkingSeconds: originalWorkState.totalWorkingSeconds,
          workCompletedAt: originalWorkState.workCompletedAt,
        },
      },
    );

  if (booking.status === "Cancelled" || booking.status === "Completed") {
    throw new Error("This booking can no longer be modified");
  }

  if (currentStatus === "Completed") {
    throw new Error("Work is already completed");
  }

  const scheduledStartTime = getScheduledDateTime(
    booking.bookingDate,
    booking.bookingTime,
  );
  if (getIndiaDateKey(scheduledStartTime) !== getIndiaDateKey(now)) {
    throw new AppError(400, 'Work actions are only allowed on the booking date');
  }

  if (action === "start") {
    if (currentStatus !== "NotStarted") {
      throw new Error("Work has already been started");
    }

    if (booking.status !== "Confirmed") {
      throw new Error("Only confirmed bookings can be started");
    }

    if (!booking.beforePhoto) {
      throw new AppError(400, 'Add a before-cleaning photo before starting work');
    }

    if (scheduledStartTime.getTime() > now.getTime()) {
      throw new AppError(
        400,
        'Work cannot start before the scheduled booking date and time',
      );
    }

    booking.status = "InProgress";
    booking.workStatus = "Working";
    booking.currentWorkStartedAt = now;

    booking.workSessions.push({
      startedAt: now,
      endedAt: null,
      durationSeconds: 0,
    } as any);
  } else if (action === "resume") {
    if (currentStatus !== "Paused") {
      throw new Error("Only paused work can be resumed");
    }

    booking.workStatus = "Working";
    booking.currentWorkStartedAt = now;

    booking.workSessions.push({
      startedAt: now,
      endedAt: null,
      durationSeconds: 0,
    } as any);
  } else if (action === "stop" || action === "done") {
    if (currentStatus !== "Working" && currentStatus !== "Paused") {
      throw new Error("Start work before performing this action");
    }

    if (
      action === "done" &&
      booking.paymentType === "Individual" &&
      booking.paymentStatus !== "Paid" &&
      booking.paymentMethod !== "Cash"
    ) {
      throw new Error("Individual booking must be paid before work can be completed");
    }
    if (action === 'done' && isUnpaidCashBooking && cashReceived === undefined) {
      throw new AppError(
        400,
        'Record whether cash was received before completing this booking',
      );
    }
    if (action === 'done') {
      const checklist = booking.cleaningChecklist;
      if (
        !booking.afterPhoto ||
        !checklist ||
        ![
          checklist.exteriorWash,
          checklist.interiorCleaning,
          checklist.dashboard,
          checklist.tyreDressing,
          checklist.vacuumCleaning,
        ].every(Boolean)
      ) {
        throw new AppError(
          400,
          'Add an after-cleaning photo and complete every checklist item before finishing',
        );
      }
    }

    if (action === 'done' && isUnpaidCashBooking && cashReceived) {
      cashTransaction = await PaymentTransaction.create({
        bookingId: booking._id,
        customerId: booking.customerId,
        amount: booking.amountPayable,
        currency: 'inr',
        provider: 'Cash',
        status: 'Pending',
        recordedByWorker: new Types.ObjectId(workerId),
      });
    }

    if (currentStatus === "Working") {
      const startedAt = booking.currentWorkStartedAt;

      if (!startedAt) {
        throw new Error("Active work session start time is missing");
      }

      const durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - startedAt.getTime()) / 1000),
      );

      const sessions = booking.workSessions;
      const activeSession = sessions[sessions.length - 1];

      if (!activeSession || activeSession.endedAt) {
        throw new Error("Active work session not found");
      }

      activeSession.endedAt = now;
      activeSession.durationSeconds = durationSeconds;

      booking.totalWorkingSeconds =
        (booking.totalWorkingSeconds || 0) + durationSeconds;

      booking.currentWorkStartedAt = null;
    }

    if (action === "stop") {
      booking.workStatus = "Paused";
    } else {
      booking.workStatus = "Completed";
      booking.status = "Completed";
      booking.workCompletedAt = now;
    }
  } else {
    throw new Error("Invalid work action");
  }

  if (action === "done") {
    const cashCollectionUpdate =
      isUnpaidCashBooking && typeof cashReceived === 'boolean'
        ? {
            cashCollectionStatus: cashReceived
              ? 'Received'
              : 'NotReceived',
            cashCollectionUpdatedAt: now,
            cashCollectionUpdatedByWorker: new Types.ObjectId(workerId),
            ...(cashReceived && cashTransaction
              ? {
                  paymentStatus: 'Paid',
                  paymentReference: String(cashTransaction._id),
                }
              : {}),
          }
        : {};
    const completedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        workerId: new Types.ObjectId(workerId),
        isDeleted: false,
        status: "InProgress",
        workStatus: currentStatus,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
      },
      {
        $set: {
          status: "Completed",
          workStatus: "Completed",
          currentWorkStartedAt: null,
          workSessions: booking.workSessions.map((session) => ({
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            durationSeconds: session.durationSeconds,
          })),
          totalWorkingSeconds: booking.totalWorkingSeconds,
          workCompletedAt: now,
          ...cashCollectionUpdate,
        },
      },
      { new: true, runValidators: true },
    );

    if (!completedBooking) {
      if (cashTransaction) {
        cashTransaction.status = 'Failed';
        await cashTransaction.save();
      }
      throw new Error('Booking work state changed; reload and try again');
    }

    if (cashTransaction) {
      cashTransaction.status = 'Paid';
      cashTransaction.verifiedAt = now;
      await cashTransaction.save();
      if (booking.customerId) {
        await NotificationService.sendCustomerNotification(
          booking.customerId,
          'CarWash cash payment received',
          `Your INR ${cashTransaction.amount} cash payment for your booking has been recorded.`,
        );
      }
    }

    if (booking.paymentType === "Membership") {
      if (!booking.membershipId) {
        await restoreOriginalWorkState();
        throw new Error("Membership booking is missing its membership");
      }

      let membershipUpdate;
      try {
        membershipUpdate = await Membership.updateOne(
          {
            _id: booking.membershipId,
            status: { $in: ["Active", "Expired"] },
            paymentStatus: "Paid",
            reservedWashes: { $gt: 0 },
            $expr: {
              $lt: [
                { $ifNull: ["$usedWashes", 0] },
                { $ifNull: ["$includedWashes", 0] },
              ],
            },
          },
          {
            $inc: { reservedWashes: -1, usedWashes: 1 },
            $pull: {
              reservedBookingDates: booking.bookingDate
                .toISOString()
                .slice(0, 10),
            },
            $addToSet: {
              usedBookingDates: booking.bookingDate
                .toISOString()
                .slice(0, 10),
            },
          },
        );
      } catch (error) {
        await restoreOriginalWorkState();
        throw error;
      }

      if (!membershipUpdate.modifiedCount) {
        await restoreOriginalWorkState();
        throw new Error(
          "Paid membership reservation not found; work cannot be completed",
        );
      }
    }
  } else {
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        workerId: new Types.ObjectId(workerId),
        isDeleted: false,
        status: originalWorkState.status,
        workStatus: originalWorkState.workStatus,
      },
      {
        $set: {
          status: booking.status,
          workStatus: booking.workStatus,
          currentWorkStartedAt: booking.currentWorkStartedAt,
          workSessions: booking.workSessions.map((session) => ({
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            durationSeconds: session.durationSeconds,
          })),
          totalWorkingSeconds: booking.totalWorkingSeconds,
          workCompletedAt: booking.workCompletedAt,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedBooking) {
      throw new Error('Booking work state changed; reload and try again');
    }
  }

  return {
    bookingId: String(booking._id),
    status: booking.status,
    workStatus: booking.workStatus,
    currentWorkStartedAt: booking.currentWorkStartedAt,
    totalWorkingSeconds: booking.totalWorkingSeconds,
    workCompletedAt: booking.workCompletedAt,
    workSessions: booking.workSessions,
  };
};

export const WorkerServices = {
  createWorkerIntoDB,
  getAllWorkersFromDB,
  getWorkerStatsFromDB,
  getSingleWorkerFromDB,
  updateWorkerInDB,
  deleteWorkerFromDB,
  workerLoginFromDB,
  getWorkerDashboard,
  getAssignedBookingsFromDB,
  getMyCashTransactionsFromDB,
  updateAssignedBookingProgress,
  updateAssignedBookingWork
};

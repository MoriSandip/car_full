import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import AppError from '../../app/errors/AppError';
import { Worker } from '../Worker/worker.model';
import { Attendance } from './attendance.model';

const getIndiaDateKey = (date = new Date()) => {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') =>
    dateParts.find((value) => value.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');

  if (!year || !month || !day) {
    throw new Error('Could not determine attendance date in Asia/Kolkata.');
  }

  return `${year}-${month}-${day}`;
};

const getMyAttendance = async (workerId: string) =>
  Attendance.findOne({ workerId, dateKey: getIndiaDateKey() })
    .select('+punchInSelfie +punchOutSelfie')
    .lean();

const getMyAttendanceHistory = async (
  workerId: string,
  pageValue: unknown,
  limitValue: unknown,
) => {
  if (!Types.ObjectId.isValid(workerId)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authenticated worker is invalid.');
  }

  const page =
    typeof pageValue === 'string' && /^\d+$/.test(pageValue)
      ? Math.max(1, Number(pageValue))
      : 1;
  const limit =
    typeof limitValue === 'string' && /^\d+$/.test(limitValue)
      ? Math.min(31, Math.max(1, Number(limitValue)))
      : 10;

  const [records, total] = await Promise.all([
    Attendance.find({ workerId: new Types.ObjectId(workerId) })
      .select('+punchInSelfie +punchOutSelfie')
      .sort({ dateKey: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Attendance.countDocuments({ workerId: new Types.ObjectId(workerId) }),
  ]);

  return {
    records,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const punchIn = async (workerId: string, selfie: string) => {
  try {
    return await Attendance.create({
      workerId,
      dateKey: getIndiaDateKey(),
      punchInAt: new Date(),
      punchInSelfie: selfie,
    });
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        'You have already punched in today.',
      );
    }
    throw error;
  }
};

const punchOut = async (workerId: string, selfie: string) => {
  const attendance = await Attendance.findOneAndUpdate(
    {
      workerId,
      dateKey: getIndiaDateKey(),
      punchOutAt: null,
    },
    { $set: { punchOutAt: new Date(), punchOutSelfie: selfie } },
    { new: true, runValidators: true },
  )
    .select('+punchInSelfie +punchOutSelfie')
    .lean();

  if (!attendance) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Punch in first, or punch out has already been completed today.',
    );
  }

  return attendance;
};

const getDailyReport = async (dateValue: unknown, workerValue: unknown) => {
  const dateKey =
    typeof dateValue === 'string' && dateValue
      ? dateValue
      : getIndiaDateKey();

  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Date must be YYYY-MM-DD.');
  }

  const workerId =
    typeof workerValue === 'string' && workerValue ? workerValue : undefined;
  if (workerId && !Types.ObjectId.isValid(workerId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid worker ID.');
  }

  const workerFilter: Record<string, unknown> = { status: 'ACTIVE' };
  if (workerId) workerFilter._id = new Types.ObjectId(workerId);

  const workers = await Worker.find(workerFilter)
    .select('name email phone')
    .sort({ name: 1 })
    .lean();
  const attendances = await Attendance.find({
    dateKey,
    ...(workerId ? { workerId: new Types.ObjectId(workerId) } : {}),
  })
    .select('+punchInSelfie +punchOutSelfie')
    .lean();
  const byWorker = new Map(
    attendances.map((attendance) => [
      String(attendance.workerId),
      attendance,
    ]),
  );
  const records = workers.map((worker) => {
    const attendance = byWorker.get(String(worker._id));
    return {
      worker,
      attendance: attendance ?? null,
      status: attendance ? 'PRESENT' : 'ABSENT',
    };
  });

  return {
    date: dateKey,
    summary: {
      totalWorkers: records.length,
      present: records.filter((record) => record.status === 'PRESENT').length,
      absent: records.filter((record) => record.status === 'ABSENT').length,
    },
    records,
  };
};

export const AttendanceServices = {
  getIndiaDateKey,
  getMyAttendance,
  getMyAttendanceHistory,
  punchIn,
  punchOut,
  getDailyReport,
};

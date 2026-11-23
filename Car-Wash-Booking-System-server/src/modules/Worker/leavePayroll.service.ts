import mongoose, { Types } from "mongoose";
import AppError from "../../app/errors/AppError";
import Booking from "../Booking/booking.model";
import { Attendance } from "../Attendance/attendance.model";
import { Worker } from "./worker.model";
import { LeaveRequest } from "./leaveRequest.model";
import { Payroll } from "./payroll.model";

type TReassignment = { bookingId: string; workerId: string };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!datePattern.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, "Dates must be valid YYYY-MM-DD values.");
  }
  return date;
};
const addDays = (date: Date, count: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
};
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const weekday = (dateKey: string) => {
  const day = parseDate(dateKey).getUTCDay();
  return day !== 0 && day !== 6;
};

const createLeaveRequest = async (
  workerId: string,
  payload: { startDate: string; endDate: string; leaveType: "Paid" | "Unpaid"; halfDay?: boolean; reason: string },
) => {
  const start = parseDate(payload.startDate);
  const end = parseDate(payload.endDate);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days > 30) throw new AppError(400, "Leave must be a maximum of 31 consecutive days.");
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (payload.startDate < todayKey) {
    throw new AppError(400, "Leave requests must start today or in the future.");
  }
  if (payload.halfDay && payload.startDate !== payload.endDate) {
    throw new AppError(400, "Half-day leave can only be requested for one day.");
  }
  const overlap = await LeaveRequest.exists({
    workerId,
    status: { $in: ["Pending", "Approved"] },
    startDate: { $lte: payload.endDate },
    endDate: { $gte: payload.startDate },
  });
  if (overlap) throw new AppError(409, "A pending or approved leave already overlaps these dates.");
  return LeaveRequest.create({ ...payload, workerId, status: "Pending" });
};

const listLeaves = async (workerId?: string) => {
  const leaves = await LeaveRequest.find(workerId ? { workerId } : {})
    .populate("workerId", "name email phone")
    .populate("reviewedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  if (workerId) return leaves;
  return Promise.all(
    leaves.map(async (leave) => {
      const start = parseDate(leave.startDate);
      const endExclusive = addDays(parseDate(leave.endDate), 1);
      const assignedWorkerId =
        leave.workerId &&
        typeof leave.workerId === "object" &&
        "_id" in leave.workerId
          ? String(leave.workerId._id)
          : String(leave.workerId);
      const bookings = await Booking.find({
        workerId: assignedWorkerId,
        bookingDate: { $gte: start, $lt: endExclusive },
        status: { $in: ["Pending", "Confirmed", "InProgress"] },
        isDeleted: false,
      })
        .select("_id bookingDate bookingTime status serviceNameSnapshot societyId flatId carId")
        .populate("societyId", "name")
        .populate("flatId", "flatNumber block")
        .populate("carId", "registrationNumber make model")
        .lean();
      return { ...leave, affectedBookings: bookings };
    }),
  );
};

const reviewLeave = async (
  leaveId: string,
  adminId: string,
  payload: { decision: "Approved" | "Rejected"; leaveType?: "Paid" | "Unpaid"; reviewNote?: string; reassignments?: TReassignment[] },
) => {
  if (!Types.ObjectId.isValid(leaveId) || !Types.ObjectId.isValid(adminId)) {
    throw new AppError(400, "Invalid leave or administrator ID.");
  }
  const leave = await LeaveRequest.findById(leaveId);
  if (!leave) throw new AppError(404, "Leave request not found.");
  if (leave.status !== "Pending") throw new AppError(409, "Only pending leave requests can be reviewed.");

  if (payload.decision === "Approved") {
    const start = parseDate(leave.startDate);
    const endExclusive = addDays(parseDate(leave.endDate), 1);
    const bookings = await Booking.find({
      workerId: leave.workerId,
      bookingDate: { $gte: start, $lt: endExclusive },
      status: { $in: ["Pending", "Confirmed", "InProgress"] },
      isDeleted: false,
    }).select("_id bookingDate workerId");
    const assignments = payload.reassignments ?? [];
    const assignmentMap = new Map(assignments.map((item) => [item.bookingId, item.workerId]));
    if (new Set(assignments.map((item) => item.bookingId)).size !== assignments.length) {
      throw new AppError(400, "A booking can only have one replacement assignment.");
    }
    if (bookings.some((booking) => !assignmentMap.has(String(booking._id)))) {
      throw new AppError(400, "Reassign every active booking on the leave dates before approval.");
    }
    if (assignments.some((item) => !bookings.some((booking) => String(booking._id) === item.bookingId))) {
      throw new AppError(400, "Reassignment includes a booking outside this leave request.");
    }
    const replacementIds = [...new Set(assignments.map((item) => item.workerId))];
    if (replacementIds.some((id) => !Types.ObjectId.isValid(id) || id === String(leave.workerId))) {
      throw new AppError(400, "Select a valid replacement worker.");
    }
    const replacements = await Worker.find({ _id: { $in: replacementIds }, status: "ACTIVE" }).select("_id");
    if (replacements.length !== replacementIds.length) throw new AppError(400, "Replacement worker must be active.");
    for (const assignment of assignments) {
      const booking = bookings.find((item) => String(item._id) === assignment.bookingId)!;
      const dateKey = booking.bookingDate.toISOString().slice(0, 10);
      const conflictingLeave = await LeaveRequest.exists({
        workerId: assignment.workerId,
        status: "Approved",
        startDate: { $lte: dateKey },
        endDate: { $gte: dateKey },
      });
      if (conflictingLeave) throw new AppError(409, "A replacement worker is on approved leave for an assigned booking date.");
    }
    if (assignments.length) {
      const result = await Booking.bulkWrite(assignments.map(({ bookingId, workerId }) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(bookingId), workerId: leave.workerId, status: { $in: ["Pending", "Confirmed", "InProgress"] } },
          update: { $set: { workerId: new Types.ObjectId(workerId), assignedAt: new Date(), assignedBy: new Types.ObjectId(adminId) } },
        },
      })));
      if (result.matchedCount !== assignments.length) {
        throw new AppError(409, "One or more bookings changed while leave approval was being processed. Review and retry.");
      }
    }
  }

  leave.status = payload.decision;
  if (payload.decision === "Approved") {
    leave.leaveType = payload.leaveType ?? leave.leaveType;
  }
  leave.reviewedBy = new Types.ObjectId(adminId);
  leave.reviewedAt = new Date();
  leave.reviewNote = payload.reviewNote;
  await leave.save();
  return leave;
};

const cancelLeave = async (workerId: string, leaveId: string) => {
  const leave = await LeaveRequest.findOne({ _id: leaveId, workerId, status: "Pending" });
  if (!leave) throw new AppError(404, "Pending leave request not found.");
  leave.status = "Cancelled";
  await leave.save();
  return leave;
};

const calculatePayroll = async (
  worker: { _id: Types.ObjectId; monthlySalary?: number; createdAt?: Date },
  periodStart: string,
  periodEnd: string,
) => {
  const start = parseDate(periodStart);
  const end = parseDate(periodEnd);
  const dayCount = (end.getTime() - start.getTime()) / 86_400_000;
  if (dayCount < 0 || dayCount > 61) throw new AppError(400, "Payroll period must be between 1 and 62 days.");
  const endExclusive = addDays(end, 1);
  const employmentStart = worker.createdAt
    ? worker.createdAt.toISOString().slice(0, 10)
    : periodStart;
  const [attendance, leaves] = await Promise.all([
    Attendance.find({ workerId: worker._id, dateKey: { $gte: periodStart, $lte: periodEnd } }).lean(),
    LeaveRequest.find({
      workerId: worker._id,
      status: "Approved",
      startDate: { $lte: periodEnd },
      endDate: { $gte: periodStart },
    }).lean(),
  ]);
  const attendanceByDay = new Map(attendance.map((item) => [item.dateKey, item]));
  const leaveByDay = new Map<string, { type: "Paid" | "Unpaid"; fraction: number }>();
  for (const leave of leaves) {
    const first = parseDate(leave.startDate) < start ? start : parseDate(leave.startDate);
    const lastCandidate = parseDate(leave.endDate);
    const last = lastCandidate > end ? end : lastCandidate;
    for (let date = first; date <= last; date = addDays(date, 1)) {
      const key = date.toISOString().slice(0, 10);
      leaveByDay.set(key, {
        type: leave.leaveType,
        fraction: leave.halfDay ? 0.5 : 1,
      });
    }
  }

  let basePay = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let overtimeHours = 0;
  let absenceDeductions = 0;
  let leaveDeductions = 0;
  let overtimePay = 0;

  for (let date = start; date < endExclusive; date = addDays(date, 1)) {
    const key = date.toISOString().slice(0, 10);
    if (key < employmentStart) continue;
    const monthDays = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    const dailyRate = Number(worker.monthlySalary || 0) / monthDays;
    basePay += dailyRate;
    const leave = leaveByDay.get(key);
    if (leave) {
      if (leave.type === "Paid") paidLeaveDays += leave.fraction;
      else {
        unpaidLeaveDays += leave.fraction;
        leaveDeductions += dailyRate * leave.fraction;
      }
    } else if (weekday(key) && !attendanceByDay.has(key)) {
      absentDays += 1;
      absenceDeductions += dailyRate;
    }
    const record = attendanceByDay.get(key);
    if (record?.punchInAt && record.punchOutAt) {
      const hours = Math.max(0, (record.punchOutAt.getTime() - record.punchInAt.getTime()) / 3_600_000);
      const dailyOvertime = Math.max(0, hours - 8);
      overtimeHours += dailyOvertime;
      overtimePay += dailyOvertime * (dailyRate / 8) * 1.5;
    }
  }

  const deductions = leaveDeductions + absenceDeductions;
  const netPay = Math.max(0, basePay - deductions + overtimePay);
  return {
    periodStart,
    periodEnd,
    monthlySalary: Number(worker.monthlySalary || 0),
    basePay: roundMoney(basePay),
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    overtimeHours: roundMoney(overtimeHours),
    overtimePay: roundMoney(overtimePay),
    deductions: roundMoney(deductions),
    grossPay: roundMoney(basePay + overtimePay),
    netPay: roundMoney(netPay),
    currency: "INR",
  };
};

const generatePayroll = async (adminId: string, periodStart: string, periodEnd: string) => {
  parseDate(periodStart);
  const parsedStart = parseDate(periodStart);
  const parsedEnd = parseDate(periodEnd);
  const dayCount = (parsedEnd.getTime() - parsedStart.getTime()) / 86_400_000;
  if (dayCount < 0 || dayCount > 61) {
    throw new AppError(400, "Payroll period must be between 1 and 62 days.");
  }
  if (!Types.ObjectId.isValid(adminId)) throw new AppError(400, "Invalid administrator ID.");
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (periodEnd >= todayKey) {
    throw new AppError(400, "Payroll can only be generated for a completed period ending before today.");
  }
  const workers = await Worker.find({ status: "ACTIVE" }).select("_id monthlySalary createdAt");
  if (!workers.length) return [];
  const missingSalary = workers.filter((worker) => Number(worker.monthlySalary || 0) <= 0);
  if (missingSalary.length) {
    throw new AppError(400, "Set a positive monthly salary for every active worker before generating payroll.");
  }
  const existing = await Payroll.findOne({
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart },
  }).select("_id");
  if (existing) throw new AppError(409, "A payroll run already overlaps this date range.");
  const records = await Promise.all(workers.map(async (worker) => ({
    workerId: worker._id,
    ...(await calculatePayroll(worker, periodStart, periodEnd)),
    generatedBy: new Types.ObjectId(adminId),
    status: "Draft" as const,
  })));
  try {
    return await Payroll.insertMany(records, { ordered: true });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      throw new AppError(409, "Payroll already exists for this period.");
    }
    throw error;
  }
};

const listPayroll = async (workerId?: string) =>
  Payroll.find(workerId ? { workerId } : {})
    .populate("workerId", "name email phone monthlySalary")
    .sort({ periodStart: -1, createdAt: -1 })
    .lean();

const updatePayroll = async (
  id: string,
  adminId: string,
  payload: { action: "approve" | "pay"; paymentReference?: string },
) => {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(adminId)) {
    throw new AppError(400, "Invalid payroll or administrator ID.");
  }
  const payroll = await Payroll.findById(id);
  if (!payroll) throw new AppError(404, "Payroll record not found.");
  if (payload.action === "approve") {
    if (payroll.status !== "Draft") throw new AppError(409, "Only draft payroll can be approved.");
    payroll.status = "Approved";
    payroll.approvedBy = new Types.ObjectId(adminId);
  } else {
    if (payroll.status !== "Approved") throw new AppError(409, "Approve payroll before recording payment.");
    payroll.status = "Paid";
    payroll.paidBy = new Types.ObjectId(adminId);
    payroll.paidAt = new Date();
    payroll.paymentReference = payload.paymentReference;
  }
  await payroll.save();
  return payroll;
};

export const LeavePayrollServices = {
  createLeaveRequest,
  listLeaves,
  reviewLeave,
  cancelLeave,
  generatePayroll,
  listPayroll,
  updatePayroll,
};

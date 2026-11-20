import mongoose, { Schema, Types } from 'mongoose';

export interface IAttendance {
  workerId: Types.ObjectId;
  dateKey: string;
  punchInAt: Date;
  punchInSelfie: string;
  punchOutAt?: Date | null;
  punchOutSelfie?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    punchInAt: { type: Date, required: true },
    punchInSelfie: { type: String, required: true, select: false },
    punchOutAt: { type: Date, default: null },
    punchOutSelfie: { type: String, default: null, select: false },
  },
  { timestamps: true },
);

attendanceSchema.index({ workerId: 1, dateKey: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>(
  'Attendance',
  attendanceSchema,
);

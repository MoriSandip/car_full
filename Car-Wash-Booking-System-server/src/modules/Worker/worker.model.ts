
import bcrypt from 'bcrypt';
import mongoose, { Schema } from 'mongoose';
import { IWorkerModel, TWorker } from './worker.interface';
import { WORKER_STATUS } from './worker.constant';

const workerSchema = new Schema<TWorker, IWorkerModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    status: {
      type: String,
      enum: Object.values(WORKER_STATUS),
      default: WORKER_STATUS.ACTIVE,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

workerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

workerSchema.statics.isWorkerExistsByEmail = async function (
  email: string,
) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

workerSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashedPassword: string,
) {
  return bcrypt.compare(plainTextPassword, hashedPassword);
};

export const Worker = mongoose.model<TWorker, IWorkerModel>(
  'Worker',
  workerSchema,
);

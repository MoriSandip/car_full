
import mongoose, { HydratedDocument, Model } from 'mongoose';
import { WORKER_STATUS } from './worker.constant';

export type TWorker = {
  _id?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  status: keyof typeof WORKER_STATUS;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface IWorkerModel extends Model<TWorker> {
  isWorkerExistsByEmail(email: string): Promise<HydratedDocument<TWorker> | null>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}

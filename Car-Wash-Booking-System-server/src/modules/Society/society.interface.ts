import mongoose, { Model } from "mongoose";
export type TSocietyStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type TSociety = {
  _id?: mongoose.Types.ObjectId;
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;

  status?: TSocietyStatus;
  verificationNote?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByRole?: "ADMIN" | "CUSTOMER";
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;

  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface SocietyModel extends Model<TSociety> {}
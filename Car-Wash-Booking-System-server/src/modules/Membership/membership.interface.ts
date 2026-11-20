
import { Model, Types } from "mongoose";

export type TMembershipStatus =
  | "Pending"
  | "Active"
  | "Expired"
  | "Cancelled";

export type TPaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Refunded";

export interface TMembership {
  carId: Types.ObjectId;
  planId: Types.ObjectId;
  offerId?: Types.ObjectId;
  societyId: Types.ObjectId;
  flatId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  paymentStatus: TPaymentStatus;
  status: TMembershipStatus;
  remarks?: string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  includedWashes: number;
  usedWashes: number;
  reservedWashes: number;
  planNameSnapshot?: string;
  planValidityDays?: number;
  planServicesSnapshot?: string[];
  reservedBookingDates?: string[];
  usedBookingDates?: string[];
workerId?: Types.ObjectId | null;
assignedAt?: Date | null;
assignedBy?: Types.ObjectId | null;

}

export interface MembershipModel extends Model<TMembership> {}

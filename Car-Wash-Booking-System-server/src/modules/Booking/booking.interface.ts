import { Types } from 'mongoose';

export type TBookingPaymentType = 'Membership' | 'Individual';

export interface IWorkSession {
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

export interface ICleaningChecklist {
  exteriorWash: boolean;
  interiorCleaning: boolean;
  dashboard: boolean;
  tyreDressing: boolean;
  vacuumCleaning: boolean;
}

export type TWorkStatus = 'NotStarted' | 'Working' | 'Paused' | 'Completed';

export type TBookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

export type TBookingPaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
export type TBookingPaymentMethod = 'Stripe' | 'Cash' | 'UPI';
export type TCashCollectionStatus = 'NotRecorded' | 'Received' | 'NotReceived';

export interface IBooking {
  customerId?: Types.ObjectId | string;
  societyId: any;
  flatId: any;
  carId: any;
  serviceId: any;
  slotId?: Types.ObjectId | string;
  membershipId?: Types.ObjectId | string;

  bookingDate: Date;
  bookingTime: string;

  paymentType: TBookingPaymentType;
  serviceNameSnapshot: string;
  servicePriceSnapshot: number;
  amountPayable: number;

  paymentStatus: TBookingPaymentStatus;
  paymentMethod?: TBookingPaymentMethod;
  paymentReference?: string;
  cashCollectionStatus?: TCashCollectionStatus;
  cashCollectionUpdatedAt?: Date | null;
  cashCollectionUpdatedByWorker?: Types.ObjectId | null;
  cashCollectionUpdatedByAdmin?: Types.ObjectId | null;
  status: TBookingStatus;
  remarks?: string;
  isDeleted?: boolean;

  // NEW: Worker assignment
  workerId?: any | null;
  assignedAt?: Date | null;
  assignedBy?: any | null;
  workStatus: TWorkStatus;
  currentWorkStartedAt: Date | null;
  workSessions: IWorkSession[];
  totalWorkingSeconds: number;
  workCompletedAt: Date | null;
  beforePhoto?: string;
  afterPhoto?: string;
  cleaningChecklist?: ICleaningChecklist;
  workerNotes?: string;
  vehicleQrVerifiedAt?: Date | null;
  vehicleQrVerifiedBy?: Types.ObjectId | null;
  vehicleQrVerifiedCarId?: Types.ObjectId | null;
  customerRating?: number;
  customerReview?: string;
  reviewedAt?: Date;
}

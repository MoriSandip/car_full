import { Types } from "mongoose";

export type TCarStatus = "Active" | "Inactive" | "Maintenance";

export type TCarType =
  | "Hatchback"
  | "Sedan"
  | "SUV"
  | "MUV"
  | "Luxury"
  | "Other";

export type TCarVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type TCar = {
  societyId: Types.ObjectId;
  flatId: Types.ObjectId;

  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;

  registrationNumber: string;
  make: string;
  model: string;
  color: string;
  imageUrl?: string;
  carType: TCarType;
  parkingSlot?: string;
  status: TCarStatus;
  description?: string;

  // Approval workflow
  verificationStatus: TCarVerificationStatus;
  createdBy: Types.ObjectId;
  createdByRole: "admin" | "CUSTOMER";
  verifiedBy?: Types.ObjectId | null;
  verifiedAt?: Date | null;
  verificationNote?: string;
  qrToken?: string;

  isDeleted: boolean;
};
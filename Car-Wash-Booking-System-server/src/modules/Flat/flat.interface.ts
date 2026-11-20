import { Types } from "mongoose";

export type TFlatStatus =
  | "Available"
  | "Occupied"
  | "Maintenance";

export type TFlatVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type TFlat = {
  societyId: Types.ObjectId;
  flatNumber: string;
  block?: string;
  floorNumber?: number;
  flatType: string;
  area?: number;
  status: TFlatStatus;
  verificationStatus: TFlatVerificationStatus;
  createdBy: Types.ObjectId;
  createdByRole: string;
  verifiedBy?: Types.ObjectId | null;
  verifiedAt?: Date | null;
  verificationNote?: string;
  description?: string;
  isDeleted: boolean;
};
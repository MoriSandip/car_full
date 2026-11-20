import { Types } from "mongoose";

export type TOfferStatus = "Active" | "Inactive";
export type TOfferDiscountType = "Percentage" | "Fixed";

export interface TOffer {
  planId: Types.ObjectId;
  title: string;
  description?: string;
  discountType: TOfferDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  status: TOfferStatus;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

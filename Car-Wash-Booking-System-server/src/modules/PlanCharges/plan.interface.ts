import { Types } from "mongoose";

export type TPlanStatus = "Active" | "Inactive";
export type TBillingCycle = "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "Custom";

export type TPlan = {
  societyId: Types.ObjectId;
  name: string;
  description?: string;
  billingCycle: TBillingCycle;
  price: number;
  includedWashes: number;
  validityDays: number;
  services: string[];
  status: TPlanStatus;
  isDeleted: boolean;
};

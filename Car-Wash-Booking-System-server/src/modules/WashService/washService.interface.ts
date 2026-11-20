
export type TWashServiceStatus = "Active" | "Inactive";

export interface IWashService {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  status: TWashServiceStatus;
  isDeleted?: boolean;
}

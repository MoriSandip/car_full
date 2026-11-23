import { model, Schema } from "mongoose";
import { AdminPermissionModule } from "./settings.constants";

export type TAdminRole = {
  name: string;
  nameKey: string;
  description?: string;
  permissions: Partial<
    Record<AdminPermissionModule, { view: boolean; manage: boolean }>
  >;
  isActive: boolean;
};

const adminRoleSchema = new Schema<TAdminRole>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true, unique: true, select: false },
    description: { type: String, trim: true, maxlength: 250, default: "" },
    permissions: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const AdminRole = model<TAdminRole>("AdminRole", adminRoleSchema);

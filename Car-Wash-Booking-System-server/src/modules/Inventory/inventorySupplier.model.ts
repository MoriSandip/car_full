import { model, Schema } from "mongoose";

const inventorySupplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contactName: { type: String, trim: true, maxlength: 100, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    address: { type: String, trim: true, maxlength: 500, default: "" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

inventorySupplierSchema.index({ name: 1, isDeleted: 1 });

export const InventorySupplier = model(
  "InventorySupplier",
  inventorySupplierSchema,
);

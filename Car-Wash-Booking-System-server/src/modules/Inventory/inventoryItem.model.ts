import { model, Schema } from "mongoose";

export const INVENTORY_UNITS = [
  "ml",
  "L",
  "g",
  "kg",
  "piece",
  "pack",
  "bottle",
  "box",
  "other",
] as const;

const inventoryItemSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    unit: { type: String, enum: INVENTORY_UNITS, required: true },
    defaultUnitCost: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

inventoryItemSchema.index(
  { sku: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: "unique_active_inventory_sku",
  },
);
inventoryItemSchema.index({ category: 1, isActive: 1, isDeleted: 1 });

export const InventoryItem = model("InventoryItem", inventoryItemSchema);

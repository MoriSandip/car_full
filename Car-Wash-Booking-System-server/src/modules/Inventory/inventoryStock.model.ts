import { model, Schema } from "mongoose";

const inventoryStockSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    quantity: { type: Number, min: 0, default: 0, required: true },
    averageUnitCost: { type: Number, min: 0, default: 0, required: true },
  },
  { timestamps: true, versionKey: false },
);

inventoryStockSchema.index({ itemId: 1, societyId: 1 }, { unique: true });
inventoryStockSchema.index({ societyId: 1, quantity: 1 });

export const InventoryStock = model("InventoryStock", inventoryStockSchema);

import { model, Schema } from "mongoose";

const inventoryLedgerSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Receipt", "Purchase", "Consumption", "Adjustment"],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    quantityBefore: { type: Number, min: 0, required: true },
    quantityAfter: { type: Number, min: 0, required: true },
    unitCost: { type: Number, min: 0, default: 0 },
    referenceType: {
      type: String,
      enum: ["Manual", "PurchaseOrder"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

inventoryLedgerSchema.index({ societyId: 1, createdAt: -1 });
inventoryLedgerSchema.index({ itemId: 1, societyId: 1, createdAt: -1 });

export const InventoryLedger = model(
  "InventoryLedger",
  inventoryLedgerSchema,
);

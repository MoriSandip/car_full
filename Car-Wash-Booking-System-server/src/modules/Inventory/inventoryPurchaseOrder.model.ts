import { model, Schema } from "mongoose";

const purchaseOrderLineSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemNameSnapshot: { type: String, required: true },
    skuSnapshot: { type: String, required: true },
    unitSnapshot: { type: String, required: true },
    orderedQuantity: { type: Number, min: 0.001, required: true },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, required: true },
  },
  { _id: true },
);

const inventoryPurchaseOrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "InventorySupplier",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Ordered", "PartiallyReceived", "Received", "Cancelled"],
      default: "Draft",
      index: true,
    },
    lines: { type: [purchaseOrderLineSchema], required: true },
    expectedAt: { type: Date, default: null },
    placedAt: { type: Date, default: null },
    placedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    receivedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

inventoryPurchaseOrderSchema.index({ societyId: 1, createdAt: -1 });

export const InventoryPurchaseOrder = model(
  "InventoryPurchaseOrder",
  inventoryPurchaseOrderSchema,
);

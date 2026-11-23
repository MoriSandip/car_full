import mongoose, { ClientSession, Types } from "mongoose";
import AppError from "../../app/errors/AppError";
import { Society } from "../Society/society.model";
import { INVENTORY_UNITS, InventoryItem } from "./inventoryItem.model";
import { InventoryLedger } from "./inventoryLedger.model";
import { InventoryPurchaseOrder } from "./inventoryPurchaseOrder.model";
import { InventoryStock } from "./inventoryStock.model";
import { InventorySupplier } from "./inventorySupplier.model";

type TItemInput = {
  sku: string;
  name: string;
  category: string;
  unit: (typeof INVENTORY_UNITS)[number];
  defaultUnitCost?: number;
  reorderLevel?: number;
};

type TSupplierInput = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type TStockAdjustment = {
  societyId: string;
  itemId: string;
  type: "Receipt" | "Consumption" | "Adjustment";
  quantity: number;
  unitCost?: number;
  note?: string;
};

type TPurchaseInput = {
  societyId: string;
  supplierId: string;
  expectedAt?: Date;
  notes?: string;
  lines: { itemId: string; quantity: number; unitCost: number }[];
};

type TReceiveInput = {
  lines: { itemId: string; quantity: number }[];
};

const ensureSociety = async (societyId: string, session?: ClientSession) => {
  if (!Types.ObjectId.isValid(societyId)) {
    throw new AppError(400, "Society ID is invalid.");
  }
  const society = await Society.findOne({
    _id: societyId,
    isDeleted: false,
    status: "VERIFIED",
  })
    .select("_id")
    .session(session ?? null);
  if (!society) throw new AppError(404, "Verified society not found.");
  return society;
};

const ensureActiveItem = async (itemId: string, session?: ClientSession) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new AppError(400, "Inventory item ID is invalid.");
  }
  const item = await InventoryItem.findOne({
    _id: itemId,
    isDeleted: false,
    isActive: true,
  }).session(session ?? null);
  if (!item) throw new AppError(404, "Active inventory item not found.");
  return item;
};

const ensureDuplicateSkuIsAvailable = async (
  sku: string,
  excludeId?: string,
) => {
  const duplicate = await InventoryItem.exists({
    sku: sku.trim().toUpperCase(),
    isDeleted: false,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (duplicate) throw new AppError(409, "SKU already exists.");
};

const getItems = async () =>
  InventoryItem.find({ isDeleted: false }).sort({ name: 1 }).lean();

const createItem = async (payload: TItemInput) => {
  const sku = payload.sku.trim().toUpperCase();
  await ensureDuplicateSkuIsAvailable(sku);
  try {
    return await InventoryItem.create({ ...payload, sku });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(409, "SKU already exists.");
    }
    throw error;
  }
};

const updateItem = async (itemId: string, payload: Partial<TItemInput> & { isActive?: boolean }) => {
  const item = await InventoryItem.findOne({ _id: itemId, isDeleted: false });
  if (!item) throw new AppError(404, "Inventory item not found.");
  if (payload.isActive === false && item.isActive) {
    const [hasStock, hasOpenOrder] = await Promise.all([
      InventoryStock.exists({ itemId, quantity: { $gt: 0 } }),
      InventoryPurchaseOrder.exists({
        status: { $in: ["Draft", "Ordered", "PartiallyReceived"] },
        "lines.itemId": itemId,
      }),
    ]);
    if (hasStock || hasOpenOrder) {
      throw new AppError(
        409,
        "Item cannot be deactivated while stock or an open purchase order exists.",
      );
    }
  }
  if (payload.sku) {
    const sku = payload.sku.trim().toUpperCase();
    await ensureDuplicateSkuIsAvailable(sku, itemId);
    item.sku = sku;
  }
  if (payload.unit && payload.unit !== item.unit) {
    const [hasStock, hasOpenOrder, hasHistory] = await Promise.all([
      InventoryStock.exists({ itemId, quantity: { $gt: 0 } }),
      InventoryPurchaseOrder.exists({
        status: { $in: ["Draft", "Ordered", "PartiallyReceived"] },
        "lines.itemId": itemId,
      }),
      InventoryLedger.exists({ itemId }),
    ]);
    if (hasStock || hasOpenOrder || hasHistory) {
      throw new AppError(
        409,
        "Unit cannot be changed after stock transactions or while stock or an open purchase order exists.",
      );
    }
    item.unit = payload.unit;
  }
  if (payload.name !== undefined) item.name = payload.name;
  if (payload.category !== undefined) item.category = payload.category;
  if (payload.defaultUnitCost !== undefined) {
    item.defaultUnitCost = payload.defaultUnitCost;
  }
  if (payload.reorderLevel !== undefined) {
    item.reorderLevel = payload.reorderLevel;
  }
  if (payload.isActive !== undefined) item.isActive = payload.isActive;
  await item.save();
  return item;
};

const getSuppliers = async () =>
  InventorySupplier.find({ isDeleted: false }).sort({ name: 1 }).lean();

const createSupplier = async (payload: TSupplierInput) =>
  InventorySupplier.create(payload);

const updateSupplier = async (
  supplierId: string,
  payload: Partial<TSupplierInput> & { isActive?: boolean },
) => {
  const supplier = await InventorySupplier.findOne({
    _id: supplierId,
    isDeleted: false,
  });
  if (!supplier) throw new AppError(404, "Supplier not found.");
  if (payload.isActive === false) {
    const hasOpenOrder = await InventoryPurchaseOrder.exists({
      supplierId,
      status: { $in: ["Draft", "Ordered", "PartiallyReceived"] },
    });
    if (hasOpenOrder) {
      throw new AppError(
        409,
        "Supplier cannot be deactivated while open purchase orders exist.",
      );
    }
  }
  Object.assign(supplier, payload);
  await supplier.save();
  return supplier;
};

const getStock = async (societyId: string) => {
  await ensureSociety(societyId);
  const [items, balances] = await Promise.all([
    InventoryItem.find({ isDeleted: false }).sort({ name: 1 }).lean(),
    InventoryStock.find({ societyId }).lean(),
  ]);
  const balanceByItem = new Map(
    balances.map((balance) => [String(balance.itemId), balance]),
  );
  const stock = items.map((item) => {
    const balance = balanceByItem.get(String(item._id));
    const quantity = balance?.quantity ?? 0;
    const averageUnitCost = balance?.averageUnitCost ?? item.defaultUnitCost;
    return {
      _id: item._id,
      itemId: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      isActive: item.isActive,
      quantity,
      reorderLevel: item.reorderLevel,
      averageUnitCost,
      stockValue: quantity * averageUnitCost,
      lowStock: item.isActive && quantity <= item.reorderLevel,
    };
  });
  const lowStock = stock.filter((item) => item.lowStock).length;
  return {
    societyId,
    summary: {
      itemCount: stock.filter((item) => item.isActive).length,
      lowStockCount: lowStock,
      totalStockValue: stock.reduce((total, item) => total + item.stockValue, 0),
    },
    data: stock,
  };
};

const updateBalance = async (
  input: {
    itemId: Types.ObjectId;
    societyId: Types.ObjectId;
    delta: number;
    unitCost: number;
    session: ClientSession;
  },
) => {
  const { itemId, societyId, delta, unitCost, session } = input;
  const before = await InventoryStock.findOne({ itemId, societyId })
    .session(session)
    .lean();
  const quantityBefore = before?.quantity ?? 0;
  if (quantityBefore + delta < 0) {
    throw new AppError(409, "Insufficient stock for this transaction.");
  }
  const quantityAfter = quantityBefore + delta;
  let averageUnitCost = before?.averageUnitCost ?? unitCost;
  if (delta > 0) {
    averageUnitCost =
      quantityAfter === 0
        ? 0
        : (quantityBefore * averageUnitCost + delta * unitCost) / quantityAfter;
  }
  const stock = await InventoryStock.findOneAndUpdate(
    { itemId, societyId, quantity: quantityBefore },
    {
      $set: { averageUnitCost },
      $inc: { quantity: delta },
      $setOnInsert: { itemId, societyId },
    },
    { new: true, upsert: !before, session, runValidators: true },
  );
  if (!stock) {
    throw new AppError(409, "Stock changed concurrently. Refresh and retry.");
  }
  return { quantityBefore, quantityAfter: stock.quantity, averageUnitCost };
};

const adjustStock = async (actorId: string, payload: TStockAdjustment) => {
  if (!Types.ObjectId.isValid(actorId)) {
    throw new AppError(401, "Administrator ID is invalid.");
  }
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      await ensureSociety(payload.societyId, session);
      const item = await ensureActiveItem(payload.itemId, session);
      const societyObjectId = new Types.ObjectId(payload.societyId);
      const delta =
        payload.type === "Consumption"
          ? -payload.quantity
          : payload.quantity;
      const currentBalance = await InventoryStock.findOne({
        itemId: item._id,
        societyId: societyObjectId,
      })
        .session(session)
        .lean();
      const unitCost =
        payload.unitCost ??
        currentBalance?.averageUnitCost ??
        item.defaultUnitCost;
      const balance = await updateBalance({
        itemId: item._id,
        societyId: societyObjectId,
        delta,
        unitCost,
        session,
      });
      const [ledger] = await InventoryLedger.create(
        [
          {
            itemId: item._id,
            societyId: societyObjectId,
            type: payload.type,
            quantityDelta: delta,
            quantityBefore: balance.quantityBefore,
            quantityAfter: balance.quantityAfter,
            unitCost,
            referenceType: "Manual",
            note: payload.note ?? "",
            performedBy: actorId,
          },
        ],
        { session },
      );
      return ledger;
    });
    if (!result) throw new AppError(500, "Stock transaction was not recorded.");
    return result;
  } finally {
    await session.endSession();
  }
};

const createPurchaseOrder = async (
  actorId: string,
  payload: TPurchaseInput,
) => {
  if (!Types.ObjectId.isValid(actorId)) {
    throw new AppError(401, "Administrator ID is invalid.");
  }
  if (new Set(payload.lines.map((line) => line.itemId)).size !== payload.lines.length) {
    throw new AppError(400, "Each item can appear only once in a purchase order.");
  }
  await ensureSociety(payload.societyId);
  const supplier = await InventorySupplier.findOne({
    _id: payload.supplierId,
    isDeleted: false,
    isActive: true,
  }).select("_id");
  if (!supplier) throw new AppError(404, "Active supplier not found.");
  const itemIds = payload.lines.map((line) => line.itemId);
  const items = await InventoryItem.find({
    _id: { $in: itemIds },
    isDeleted: false,
    isActive: true,
  }).lean();
  if (items.length !== itemIds.length) {
    throw new AppError(400, "One or more selected items are inactive or missing.");
  }
  const itemById = new Map(items.map((item) => [String(item._id), item]));
  const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${new Types.ObjectId().toString().slice(-6).toUpperCase()}`;
  const lines = payload.lines.map((line) => {
    const item = itemById.get(line.itemId);
    if (!item) throw new AppError(400, "Purchase order item not found.");
    return {
      itemId: item._id,
      itemNameSnapshot: item.name,
      skuSnapshot: item.sku,
      unitSnapshot: item.unit,
      orderedQuantity: line.quantity,
      receivedQuantity: 0,
      unitCost: line.unitCost,
    };
  });
  return InventoryPurchaseOrder.create({
    ...payload,
    orderNumber,
    lines,
    createdBy: actorId,
    status: "Draft",
  });
};

const getPurchaseOrders = async (filters: {
  societyId?: string;
  status?: string;
  page: number;
  limit: number;
}) => {
  const page = Math.max(1, Math.floor(filters.page));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit)));
  const query = {
    ...(filters.societyId ? { societyId: filters.societyId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [data, total] = await Promise.all([
    InventoryPurchaseOrder.find(query)
      .populate("societyId", "name")
      .populate("supplierId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryPurchaseOrder.countDocuments(query),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const placePurchaseOrder = async (actorId: string, orderId: string) => {
  if (!Types.ObjectId.isValid(actorId)) {
    throw new AppError(401, "Administrator ID is invalid.");
  }
  const order = await InventoryPurchaseOrder.findOneAndUpdate(
    { _id: orderId, status: "Draft" },
    {
      $set: {
        status: "Ordered",
        placedAt: new Date(),
        placedBy: actorId,
      },
    },
    { new: true, runValidators: true },
  );
  if (!order) throw new AppError(409, "Draft purchase order not found or already placed.");
  return order;
};

const receivePurchaseOrder = async (
  actorId: string,
  orderId: string,
  payload: TReceiveInput,
) => {
  if (!Types.ObjectId.isValid(actorId)) {
    throw new AppError(401, "Administrator ID is invalid.");
  }
  if (new Set(payload.lines.map((line) => line.itemId)).size !== payload.lines.length) {
    throw new AppError(400, "Each item can appear only once in a receipt.");
  }
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const order = await InventoryPurchaseOrder.findById(orderId).session(session);
      if (!order || !["Ordered", "PartiallyReceived"].includes(order.status)) {
        throw new AppError(409, "Only placed purchase orders can receive stock.");
      }
      const societyId = new Types.ObjectId(String(order.societyId));
      const lineByItem = new Map(
        order.lines.map((line) => [String(line.itemId), line]),
      );
      for (const receivedLine of payload.lines) {
        const line = lineByItem.get(receivedLine.itemId);
        if (!line) {
          throw new AppError(400, "Receipt contains an item not in the purchase order.");
        }
        const remaining = line.orderedQuantity - line.receivedQuantity;
        if (receivedLine.quantity > remaining) {
          throw new AppError(
            400,
            `Received quantity exceeds the remaining order quantity for ${line.itemNameSnapshot}.`,
          );
        }
        const item = await ensureActiveItem(receivedLine.itemId, session);
        const balance = await updateBalance({
          itemId: item._id,
          societyId,
          delta: receivedLine.quantity,
          unitCost: line.unitCost,
          session,
        });
        await InventoryLedger.create(
          [
            {
              itemId: item._id,
              societyId,
              type: "Purchase",
              quantityDelta: receivedLine.quantity,
              quantityBefore: balance.quantityBefore,
              quantityAfter: balance.quantityAfter,
              unitCost: line.unitCost,
              referenceType: "PurchaseOrder",
              referenceId: order._id,
              note: `Received against ${order.orderNumber}`,
              performedBy: actorId,
            },
          ],
          { session },
        );
        line.receivedQuantity += receivedLine.quantity;
      }
      const fullyReceived = order.lines.every(
        (line) => line.receivedQuantity >= line.orderedQuantity,
      );
      order.status = fullyReceived ? "Received" : "PartiallyReceived";
      if (fullyReceived) order.receivedAt = new Date();
      await order.save({ session });
      return order;
    });
    if (!result) throw new AppError(500, "Purchase receipt was not recorded.");
    return result;
  } finally {
    await session.endSession();
  }
};

const cancelPurchaseOrder = async (actorId: string, orderId: string) => {
  if (!Types.ObjectId.isValid(actorId)) {
    throw new AppError(401, "Administrator ID is invalid.");
  }
  const order = await InventoryPurchaseOrder.findOneAndUpdate(
    { _id: orderId, status: { $in: ["Draft", "Ordered"] } },
    {
      $set: {
        status: "Cancelled",
        cancelledAt: new Date(),
        cancelledBy: actorId,
      },
    },
    { new: true },
  );
  if (!order) {
    throw new AppError(
      409,
      "Only draft or unreceived purchase orders can be cancelled.",
    );
  }
  return order;
};

const getLedger = async (filters: {
  societyId: string;
  itemId?: string;
  page: number;
  limit: number;
}) => {
  await ensureSociety(filters.societyId);
  const page = Math.max(1, Math.floor(filters.page));
  const limit = Math.min(200, Math.max(1, Math.floor(filters.limit)));
  const query = {
    societyId: filters.societyId,
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
  };
  const [data, total] = await Promise.all([
    InventoryLedger.find(query)
      .populate("itemId", "name sku unit")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryLedger.countDocuments(query),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const InventoryService = {
  getItems,
  createItem,
  updateItem,
  getSuppliers,
  createSupplier,
  updateSupplier,
  getStock,
  adjustStock,
  createPurchaseOrder,
  getPurchaseOrders,
  placePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getLedger,
};

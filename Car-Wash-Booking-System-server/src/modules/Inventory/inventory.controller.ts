import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../app/errors/AppError";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import { InventoryService } from "./inventory.service";

const respond = (
  res: Response,
  data: unknown,
  message: string,
  statusCode: number = httpStatus.OK,
) =>
  sendResponse(res, {
    statusCode,
    success: true,
    message,
    data,
  });

const getActorId = (req: Request) => {
  const actorId = req.user?.sub;
  if (!actorId) throw new AppError(401, "Administrator ID is unavailable.");
  return String(actorId);
};

const listItems = catchAsync(async (_req: Request, res: Response) => {
  respond(res, await InventoryService.getItems(), "Inventory items retrieved.");
});

const createItem = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.createItem(req.body);
  respond(res, result, "Inventory item created.", httpStatus.CREATED);
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.updateItem(req.params.id, req.body);
  respond(res, result, "Inventory item updated.");
});

const listSuppliers = catchAsync(async (_req: Request, res: Response) => {
  respond(
    res,
    await InventoryService.getSuppliers(),
    "Inventory suppliers retrieved.",
  );
});

const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.createSupplier(req.body);
  respond(res, result, "Supplier created.", httpStatus.CREATED);
});

const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.updateSupplier(req.params.id, req.body);
  respond(res, result, "Supplier updated.");
});

const getStock = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.getStock(String(req.query.societyId));
  respond(res, result, "Society stock retrieved.");
});

const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.adjustStock(getActorId(req), req.body);
  respond(res, result, "Stock transaction recorded.", httpStatus.CREATED);
});

const getLedger = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.getLedger({
    societyId: String(req.query.societyId),
    itemId: req.query.itemId ? String(req.query.itemId) : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  respond(res, result, "Inventory ledger retrieved.");
});

const listPurchaseOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.getPurchaseOrders({
    societyId: req.query.societyId ? String(req.query.societyId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  respond(res, result, "Purchase orders retrieved.");
});

const createPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.createPurchaseOrder(
    getActorId(req),
    req.body,
  );
  respond(res, result, "Draft purchase order created.", httpStatus.CREATED);
});

const placePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.placePurchaseOrder(
    getActorId(req),
    req.params.id,
  );
  respond(res, result, "Purchase order placed.");
});

const receivePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.receivePurchaseOrder(
    getActorId(req),
    req.params.id,
    req.body,
  );
  respond(res, result, "Purchase order receipt recorded.");
});

const cancelPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.cancelPurchaseOrder(
    getActorId(req),
    req.params.id,
  );
  respond(res, result, "Purchase order cancelled.");
});

export const InventoryController = {
  listItems,
  createItem,
  updateItem,
  listSuppliers,
  createSupplier,
  updateSupplier,
  getStock,
  adjustStock,
  getLedger,
  listPurchaseOrders,
  createPurchaseOrder,
  placePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
};

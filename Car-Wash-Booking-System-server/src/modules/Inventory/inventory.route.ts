import { Router } from "express";
import validateRequest from "../../app/middlewares/validateRequest";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { InventoryController } from "./inventory.controller";
import {
  adjustStockSchema,
  createItemSchema,
  createPurchaseOrderSchema,
  createSupplierSchema,
  ledgerQuerySchema,
  orderListQuerySchema,
  purchaseOrderIdSchema,
  receivePurchaseOrderSchema,
  stockQuerySchema,
  updateItemSchema,
  updateSupplierSchema,
} from "./inventory.validation";

const route = Router();
const admin = auth(USER_ROLE.admin);

route.get("/items", admin, InventoryController.listItems);
route.post(
  "/items",
  admin,
  validateRequest(createItemSchema),
  InventoryController.createItem,
);
route.patch(
  "/items/:id",
  admin,
  validateRequest(updateItemSchema),
  InventoryController.updateItem,
);

route.get("/suppliers", admin, InventoryController.listSuppliers);
route.post(
  "/suppliers",
  admin,
  validateRequest(createSupplierSchema),
  InventoryController.createSupplier,
);
route.patch(
  "/suppliers/:id",
  admin,
  validateRequest(updateSupplierSchema),
  InventoryController.updateSupplier,
);

route.get(
  "/stock",
  admin,
  validateRequest(stockQuerySchema),
  InventoryController.getStock,
);
route.post(
  "/stock/adjust",
  admin,
  validateRequest(adjustStockSchema),
  InventoryController.adjustStock,
);
route.get(
  "/ledger",
  admin,
  validateRequest(ledgerQuerySchema),
  InventoryController.getLedger,
);

route.get(
  "/orders",
  admin,
  validateRequest(orderListQuerySchema),
  InventoryController.listPurchaseOrders,
);
route.post(
  "/orders",
  admin,
  validateRequest(createPurchaseOrderSchema),
  InventoryController.createPurchaseOrder,
);
route.patch(
  "/orders/:id/place",
  admin,
  validateRequest(purchaseOrderIdSchema),
  InventoryController.placePurchaseOrder,
);
route.post(
  "/orders/:id/receive",
  admin,
  validateRequest(receivePurchaseOrderSchema),
  InventoryController.receivePurchaseOrder,
);
route.patch(
  "/orders/:id/cancel",
  admin,
  validateRequest(purchaseOrderIdSchema),
  InventoryController.cancelPurchaseOrder,
);

export const inventoryRoute = route;

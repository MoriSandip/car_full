import { z } from "zod";
import { INVENTORY_UNITS } from "./inventoryItem.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");
const positiveQuantity = z.coerce.number().finite().positive();

export const createItemSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    unit: z.enum(INVENTORY_UNITS),
    defaultUnitCost: z.coerce.number().finite().min(0).default(0),
    reorderLevel: z.coerce.number().finite().min(0).default(0),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      sku: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/).optional(),
      name: z.string().trim().min(1).max(120).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      unit: z.enum(INVENTORY_UNITS).optional(),
      defaultUnitCost: z.coerce.number().finite().min(0).optional(),
      reorderLevel: z.coerce.number().finite().min(0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "Provide at least one field."),
});

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    contactName: z.string().trim().max(100).optional().default(""),
    phone: z.string().trim().max(30).optional().default(""),
    email: z.string().trim().email().or(z.literal("")).optional().default(""),
    address: z.string().trim().max(500).optional().default(""),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      contactName: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      email: z.string().trim().email().or(z.literal("")).optional(),
      address: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "Provide at least one field."),
});

export const stockQuerySchema = z.object({
  query: z.object({ societyId: objectId }),
});

export const adjustStockSchema = z.object({
  body: z
    .object({
      societyId: objectId,
      itemId: objectId,
      type: z.enum(["Receipt", "Consumption", "Adjustment"]),
      quantity: z.coerce.number().finite(),
      unitCost: z.coerce.number().finite().min(0).optional(),
      note: z.string().trim().max(500).optional().default(""),
    })
    .superRefine((body, context) => {
      if (body.type === "Adjustment" && body.quantity === 0) {
        context.addIssue({
          code: "custom",
          path: ["quantity"],
          message: "Adjustment quantity cannot be zero.",
        });
      }
      if (body.type !== "Adjustment" && body.quantity <= 0) {
        context.addIssue({
          code: "custom",
          path: ["quantity"],
          message: "Receipt and consumption quantity must be greater than zero.",
        });
      }
    }),
});

export const ledgerQuerySchema = z.object({
  query: z.object({
    societyId: objectId,
    itemId: objectId.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    societyId: objectId,
    supplierId: objectId,
    expectedAt: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional().default(""),
    lines: z
      .array(
        z.object({
          itemId: objectId,
          quantity: positiveQuantity,
          unitCost: z.coerce.number().finite().min(0),
        }),
      )
      .min(1)
      .max(100),
  }),
});

export const purchaseOrderIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const receivePurchaseOrderSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    lines: z
      .array(
        z.object({
          itemId: objectId,
          quantity: positiveQuantity,
        }),
      )
      .min(1)
      .max(100),
  }),
});

export const orderListQuerySchema = z.object({
  query: z.object({
    societyId: objectId.optional(),
    status: z
      .enum(["Draft", "Ordered", "PartiallyReceived", "Received", "Cancelled"])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

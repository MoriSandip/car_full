import { baseApi } from "@/redux/api/baseApi";

export const inventoryUnits = [
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

export type InventoryUnit = (typeof inventoryUnits)[number];
export type InventorySupplier = {
  _id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
};

export type InventoryItem = {
  _id: string;
  sku: string;
  name: string;
  category: string;
  unit: InventoryUnit;
  defaultUnitCost: number;
  reorderLevel: number;
  isActive: boolean;
};

export type InventoryStockRow = InventoryItem & {
  itemId: string;
  quantity: number;
  averageUnitCost: number;
  stockValue: number;
  lowStock: boolean;
};

export type InventoryStockResponse = {
  societyId: string;
  summary: {
    itemCount: number;
    lowStockCount: number;
    totalStockValue: number;
  };
  data: InventoryStockRow[];
};

export type InventoryOrderLine = {
  _id: string;
  itemId: string;
  itemNameSnapshot: string;
  skuSnapshot: string;
  unitSnapshot: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
};

export type InventoryPurchaseOrder = {
  _id: string;
  orderNumber: string;
  societyId: string | { _id: string; name?: string };
  supplierId: string | { _id: string; name?: string };
  status: "Draft" | "Ordered" | "PartiallyReceived" | "Received" | "Cancelled";
  lines: InventoryOrderLine[];
  expectedAt?: string | null;
  placedAt?: string | null;
  receivedAt?: string | null;
  notes?: string;
  createdAt: string;
};

export type InventoryLedgerEntry = {
  _id: string;
  type: "Receipt" | "Purchase" | "Consumption" | "Adjustment";
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  note?: string;
  createdAt: string;
  itemId: string | { _id: string; name?: string; sku?: string; unit?: string };
  performedBy?: string | { name?: string };
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateInventoryItem = Omit<InventoryItem, "_id" | "isActive">;
export type CreateInventorySupplier = Omit<InventorySupplier, "_id" | "isActive">;

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryItems: builder.query<ApiResponse<InventoryItem[]>, void>({
      query: () => ({ url: "/inventory/items" }),
      providesTags: ["Inventory"],
    }),
    createInventoryItem: builder.mutation<
      ApiResponse<InventoryItem>,
      CreateInventoryItem
    >({
      query: (body) => ({ url: "/inventory/items", method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    updateInventoryItem: builder.mutation<
      ApiResponse<InventoryItem>,
      { id: string; body: Partial<CreateInventoryItem> & { isActive?: boolean } }
    >({
      query: ({ id, body }) => ({
        url: `/inventory/items/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getInventorySuppliers: builder.query<
      ApiResponse<InventorySupplier[]>,
      void
    >({
      query: () => ({ url: "/inventory/suppliers" }),
      providesTags: ["Inventory"],
    }),
    createInventorySupplier: builder.mutation<
      ApiResponse<InventorySupplier>,
      CreateInventorySupplier
    >({
      query: (body) => ({ url: "/inventory/suppliers", method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    updateInventorySupplier: builder.mutation<
      ApiResponse<InventorySupplier>,
      { id: string; body: Partial<CreateInventorySupplier> & { isActive?: boolean } }
    >({
      query: ({ id, body }) => ({
        url: `/inventory/suppliers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
    getInventoryStock: builder.query<
      ApiResponse<InventoryStockResponse>,
      { societyId: string }
    >({
      query: (params) => ({ url: "/inventory/stock", params }),
      providesTags: ["Inventory"],
    }),
    adjustInventoryStock: builder.mutation<
      ApiResponse<InventoryLedgerEntry>,
      {
        societyId: string;
        itemId: string;
        type: "Receipt" | "Consumption" | "Adjustment";
        quantity: number;
        unitCost?: number;
        note?: string;
      }
    >({
      query: (body) => ({ url: "/inventory/stock/adjust", method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    getInventoryLedger: builder.query<
      ApiResponse<Paginated<InventoryLedgerEntry>>,
      { societyId: string; itemId?: string; page: number; limit: number }
    >({
      query: (params) => ({ url: "/inventory/ledger", params }),
      providesTags: ["Inventory"],
    }),
    getInventoryOrders: builder.query<
      ApiResponse<Paginated<InventoryPurchaseOrder>>,
      {
        societyId?: string;
        status?: InventoryPurchaseOrder["status"];
        page: number;
        limit: number;
      }
    >({
      query: (params) => ({ url: "/inventory/orders", params }),
      providesTags: ["Inventory"],
    }),
    createInventoryOrder: builder.mutation<
      ApiResponse<InventoryPurchaseOrder>,
      {
        societyId: string;
        supplierId: string;
        expectedAt?: string;
        notes?: string;
        lines: { itemId: string; quantity: number; unitCost: number }[];
      }
    >({
      query: (body) => ({ url: "/inventory/orders", method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    placeInventoryOrder: builder.mutation<
      ApiResponse<InventoryPurchaseOrder>,
      string
    >({
      query: (id) => ({
        url: `/inventory/orders/${id}/place`,
        method: "PATCH",
      }),
      invalidatesTags: ["Inventory"],
    }),
    receiveInventoryOrder: builder.mutation<
      ApiResponse<InventoryPurchaseOrder>,
      { id: string; lines: { itemId: string; quantity: number }[] }
    >({
      query: ({ id, lines }) => ({
        url: `/inventory/orders/${id}/receive`,
        method: "POST",
        body: { lines },
      }),
      invalidatesTags: ["Inventory"],
    }),
    cancelInventoryOrder: builder.mutation<
      ApiResponse<InventoryPurchaseOrder>,
      string
    >({
      query: (id) => ({
        url: `/inventory/orders/${id}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: ["Inventory"],
    }),
  }),
});

export const {
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useGetInventorySuppliersQuery,
  useCreateInventorySupplierMutation,
  useUpdateInventorySupplierMutation,
  useGetInventoryStockQuery,
  useAdjustInventoryStockMutation,
  useGetInventoryLedgerQuery,
  useGetInventoryOrdersQuery,
  useCreateInventoryOrderMutation,
  usePlaceInventoryOrderMutation,
  useReceiveInventoryOrderMutation,
  useCancelInventoryOrderMutation,
} = inventoryApi;

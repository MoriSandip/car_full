import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, PackagePlus, Pencil, Plus, RefreshCw, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetSocietiesQuery } from "@/redux/features/society/societyApi";
import {
  inventoryUnits,
  type InventoryItem,
  type InventoryPurchaseOrder,
  type InventorySupplier,
  useAdjustInventoryStockMutation,
  useCancelInventoryOrderMutation,
  useCreateInventoryItemMutation,
  useCreateInventoryOrderMutation,
  useCreateInventorySupplierMutation,
  useGetInventoryItemsQuery,
  useGetInventoryLedgerQuery,
  useGetInventoryOrdersQuery,
  useGetInventoryStockQuery,
  useGetInventorySuppliersQuery,
  usePlaceInventoryOrderMutation,
  useReceiveInventoryOrderMutation,
  useUpdateInventoryItemMutation,
  useUpdateInventorySupplierMutation,
} from "@/redux/features/inventory/inventoryApi";

type SocietyOption = { _id: string; name: string; status?: string; isDeleted?: boolean };
type ItemForm = {
  sku: string;
  name: string;
  category: string;
  unit: (typeof inventoryUnits)[number];
  defaultUnitCost: string;
  reorderLevel: string;
  isActive: boolean;
};
type SupplierForm = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
};
type OrderLineForm = { itemId: string; quantity: string; unitCost: string };
type StockForm = {
  itemId: string;
  type: "Receipt" | "Consumption" | "Adjustment";
  quantity: string;
  unitCost: string;
  note: string;
};
type CsvCell = string | number | null | undefined;

const emptyItem: ItemForm = {
  sku: "",
  name: "",
  category: "",
  unit: "piece",
  defaultUnitCost: "0",
  reorderLevel: "0",
  isActive: true,
};
const emptySupplier: SupplierForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  isActive: true,
};
const newOrderLine = (): OrderLineForm => ({
  itemId: "",
  quantity: "1",
  unitCost: "0",
});
const emptyStockForm: StockForm = {
  itemId: "",
  type: "Consumption",
  quantity: "",
  unitCost: "",
  note: "",
};

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const csvValue = (value: CsvCell) => {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: CsvCell[][]) => {
  const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return error instanceof Error ? error.message : "Inventory operation failed.";
};

const extractArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "object" || value === null) return [];
  const record = value as Record<string, unknown>;
  for (const key of ["data", "result", "results", "items"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = extractArray(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
};

const isSociety = (value: unknown): value is SocietyOption =>
  typeof value === "object" &&
  value !== null &&
  "_id" in value &&
  "name" in value &&
  typeof value._id === "string" &&
  typeof value.name === "string";

const referenceLabel = (
  value: string | { name?: string } | undefined,
  fallback: string,
) => (typeof value === "object" && value?.name ? value.name : fallback);

const dateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Pager({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {Math.max(totalPages, 1)}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

export default function InventoryManagement() {
  const [section, setSection] = useState("stock");
  const [societyId, setSocietyId] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<InventorySupplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplier);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockForm, setStockForm] = useState<StockForm>(emptyStockForm);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderLines, setOrderLines] = useState<OrderLineForm[]>([newOrderLine()]);
  const [receiveTarget, setReceiveTarget] = useState<InventoryPurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [orderPage, setOrderPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [itemSearch, setItemSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState<
    InventoryPurchaseOrder["status"] | "All"
  >("All");
  const [ledgerItemId, setLedgerItemId] = useState("");

  const societiesQuery = useGetSocietiesQuery();
  const verifiedSocieties = useMemo(
    () =>
      extractArray(societiesQuery.data)
        .filter(isSociety)
        .filter((society) => society.status === "VERIFIED" && society.isDeleted !== true),
    [societiesQuery.data],
  );
  useEffect(() => {
    if (!societyId && verifiedSocieties[0]) setSocietyId(verifiedSocieties[0]._id);
  }, [societyId, verifiedSocieties]);

  const itemsQuery = useGetInventoryItemsQuery();
  const suppliersQuery = useGetInventorySuppliersQuery();
  const stockQuery = useGetInventoryStockQuery(
    { societyId },
    { skip: !societyId },
  );
  const ordersQuery = useGetInventoryOrdersQuery(
    {
      societyId,
      status: orderStatus === "All" ? undefined : orderStatus,
      page: orderPage,
      limit: 20,
    },
    { skip: !societyId },
  );
  const ledgerQuery = useGetInventoryLedgerQuery(
    {
      societyId,
      itemId: ledgerItemId || undefined,
      page: ledgerPage,
      limit: 50,
    },
    { skip: !societyId },
  );

  const [createItem] = useCreateInventoryItemMutation();
  const [updateItem] = useUpdateInventoryItemMutation();
  const [createSupplier] = useCreateInventorySupplierMutation();
  const [updateSupplier] = useUpdateInventorySupplierMutation();
  const [adjustStock] = useAdjustInventoryStockMutation();
  const [createOrder] = useCreateInventoryOrderMutation();
  const [placeOrder] = usePlaceInventoryOrderMutation();
  const [receiveOrder] = useReceiveInventoryOrderMutation();
  const [cancelOrder] = useCancelInventoryOrderMutation();

  const items = itemsQuery.data?.data ?? [];
  const activeItems = items.filter((item) => item.isActive);
  const suppliers = suppliersQuery.data?.data ?? [];
  const activeSuppliers = suppliers.filter((supplier) => supplier.isActive);
  const stockResponse = stockQuery.data?.data;
  const stockRows = stockResponse?.data ?? [];
  const search = itemSearch.trim().toLowerCase();
  const filteredStockRows = search
    ? stockRows.filter((item) =>
      [item.sku, item.name, item.category].some((value) =>
        value.toLowerCase().includes(search),
      ),
    )
    : stockRows;
  const orderResponse = ordersQuery.data?.data;
  const orders = orderResponse?.data ?? [];
  const ledgerResponse = ledgerQuery.data?.data;
  const ledgerEntries = ledgerResponse?.data ?? [];

  const resetItemDialog = () => {
    setSelectedItem(null);
    setItemForm(emptyItem);
    setItemDialogOpen(false);
  };
  const openNewItem = () => {
    setSelectedItem(null);
    setItemForm(emptyItem);
    setItemDialogOpen(true);
  };
  const openEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      defaultUnitCost: String(item.defaultUnitCost),
      reorderLevel: String(item.reorderLevel),
      isActive: item.isActive,
    });
    setItemDialogOpen(true);
  };
  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      sku: itemForm.sku.trim(),
      name: itemForm.name.trim(),
      category: itemForm.category.trim(),
      unit: itemForm.unit,
      defaultUnitCost: Number(itemForm.defaultUnitCost),
      reorderLevel: Number(itemForm.reorderLevel),
    };
    try {
      if (selectedItem) {
        await updateItem({
          id: selectedItem._id,
          body: { ...payload, isActive: itemForm.isActive },
        }).unwrap();
        toast.success("Inventory item updated.");
      } else {
        await createItem(payload).unwrap();
        toast.success("Inventory item created.");
      }
      resetItemDialog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openNewSupplier = () => {
    setSelectedSupplier(null);
    setSupplierForm(emptySupplier);
    setSupplierDialogOpen(true);
  };
  const openEditSupplier = (supplier: InventorySupplier) => {
    setSelectedSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      isActive: supplier.isActive,
    });
    setSupplierDialogOpen(true);
  };
  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: supplierForm.name.trim(),
      contactName: supplierForm.contactName.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      address: supplierForm.address.trim(),
    };
    try {
      if (selectedSupplier) {
        await updateSupplier({
          id: selectedSupplier._id,
          body: { ...payload, isActive: supplierForm.isActive },
        }).unwrap();
        toast.success("Supplier updated.");
      } else {
        await createSupplier(payload).unwrap();
        toast.success("Supplier created.");
      }
      setSupplierDialogOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const saveStockTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!societyId) return;
    try {
      await adjustStock({
        societyId,
        itemId: stockForm.itemId,
        type: stockForm.type,
        quantity: Number(stockForm.quantity),
        unitCost: stockForm.unitCost ? Number(stockForm.unitCost) : undefined,
        note: stockForm.note.trim(),
      }).unwrap();
      toast.success("Stock transaction recorded.");
      setStockDialogOpen(false);
      setStockForm(emptyStockForm);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openOrderDialog = () => {
    setOrderSupplierId(activeSuppliers[0]?._id ?? "");
    setExpectedAt("");
    setOrderNotes("");
    setOrderLines([newOrderLine()]);
    setOrderDialogOpen(true);
  };
  const setOrderLine = (index: number, patch: Partial<OrderLineForm>) => {
    setOrderLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  };
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!societyId) return;
    try {
      await createOrder({
        societyId,
        supplierId: orderSupplierId,
        expectedAt: expectedAt || undefined,
        notes: orderNotes.trim(),
        lines: orderLines.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
        })),
      }).unwrap();
      toast.success("Draft purchase order created.");
      setOrderDialogOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openReceiveDialog = (order: InventoryPurchaseOrder) => {
    setReceiveTarget(order);
    setReceiveQuantities(
      Object.fromEntries(
        order.lines
          .filter((line) => line.orderedQuantity > line.receivedQuantity)
          .map((line) => [
            line.itemId,
            String(line.orderedQuantity - line.receivedQuantity),
          ]),
      ),
    );
  };
  const submitReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receiveTarget) return;
    const lines = receiveTarget.lines
      .map((line) => ({
        itemId: line.itemId,
        quantity: Number(receiveQuantities[line.itemId] || 0),
      }))
      .filter((line) => line.quantity > 0);
    if (!lines.length) {
      toast.error("Enter at least one received quantity.");
      return;
    }
    try {
      await receiveOrder({ id: receiveTarget._id, lines }).unwrap();
      toast.success("Received quantities added to society stock.");
      setReceiveTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const refreshInventory = () => {
    void Promise.all([
      societiesQuery.refetch(),
      itemsQuery.refetch(),
      suppliersQuery.refetch(),
      ...(societyId
        ? [stockQuery.refetch(), ordersQuery.refetch(), ledgerQuery.refetch()]
        : []),
    ]);
  };

  const exportStock = () => {
    if (!stockResponse) return;
    downloadCsv(`inventory-stock-${societyId}.csv`, [
      ["SKU", "Item", "Category", "Quantity", "Unit", "Reorder level", "Average cost", "Stock value", "Status"],
      ...stockRows.map((row) => [
        row.sku,
        row.name,
        row.category,
        row.quantity,
        row.unit,
        row.reorderLevel,
        row.averageUnitCost,
        row.stockValue,
        row.lowStock ? "Low stock" : row.isActive ? "In stock" : "Inactive",
      ]),
    ]);
    toast.success("Stock report exported.");
  };

  const exportLedger = () => {
    if (!ledgerResponse) return;
    downloadCsv(`inventory-ledger-${societyId}-page-${ledgerPage}.csv`, [
      ["Date", "Item", "Transaction", "Quantity change", "Before", "After", "Unit cost", "Note"],
      ...ledgerEntries.map((entry) => [
        entry.createdAt,
        typeof entry.itemId === "object" ? `${entry.itemId.sku ?? ""} ${entry.itemId.name ?? ""}` : "",
        entry.type,
        entry.quantityDelta,
        entry.quantityBefore,
        entry.quantityAfter,
        entry.unitCost,
        entry.note,
      ]),
    ]);
    toast.success("Ledger page exported.");
  };

  const selectSociety = (nextSocietyId: string) => {
    setSocietyId(nextSocietyId);
    setOrderPage(1);
    setLedgerPage(1);
  };
  const selectOrderStatus = (value: string) => {
    setOrderStatus(value as InventoryPurchaseOrder["status"] | "All");
    setOrderPage(1);
  };
  const selectLedgerItem = (value: string) => {
    setLedgerItemId(value === "all" ? "" : value);
    setLedgerPage(1);
  };

  return (
    <main className="space-y-6 px-4 py-4 sm:px-6 lg:px-14">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Society-wise consumables, stock movements, suppliers and procurement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Stock location
            <Select value={societyId} onValueChange={selectSociety}>
              <SelectTrigger className="min-w-52 bg-white">
                <SelectValue placeholder="Choose a verified society" />
              </SelectTrigger>
              <SelectContent>
                {verifiedSocieties.map((society) => (
                  <SelectItem key={society._id} value={society._id}>
                    {society.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={refreshInventory}
            disabled={
              societiesQuery.isFetching ||
              itemsQuery.isFetching ||
              suppliersQuery.isFetching ||
              stockQuery.isFetching
            }
            className="self-end"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </header>

      {societiesQuery.isError ? (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Could not load societies.
        </p>
      ) : null}
      {itemsQuery.isError || suppliersQuery.isError ? (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Could not load inventory catalog or suppliers.
        </p>
      ) : null}
      {!verifiedSocieties.length && !societiesQuery.isLoading ? (
        <p className="rounded-md border bg-white p-5 text-sm text-muted-foreground">
          Verify a society before managing its inventory.
        </p>
      ) : null}

      {stockResponse ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Active items"
            value={stockResponse.summary.itemCount}
            detail="Catalog items available for stock operations"
          />
          <Metric
            label="Low stock"
            value={stockResponse.summary.lowStockCount}
            detail="At or below configured reorder level"
          />
          <Metric
            label="Estimated stock value"
            value={money(stockResponse.summary.totalStockValue)}
            detail="Quantity × weighted average unit cost"
          />
        </section>
      ) : null}

      {stockResponse?.summary.lowStockCount ? (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {stockResponse.summary.lowStockCount} item(s) are at or below reorder level for this society.
        </div>
      ) : null}

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="stock">Stock & Items</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Consumables & stock</CardTitle>
                <CardDescription>
                  Balances are tracked separately for each verified society.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={exportStock} disabled={!stockResponse}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export stock CSV
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setStockForm(emptyStockForm);
                  setStockDialogOpen(true);
                }} disabled={!societyId || !activeItems.length}>
                  <PackagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Stock transaction
                </Button>
                <Button type="button" onClick={openNewItem}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border px-3">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Search inventory items</span>
                <input
                  type="search"
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Search SKU, item or category"
                  className="h-10 w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="overflow-x-auto">
                <table className="list-table">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      {["SKU", "Item", "Category", "On hand", "Reorder at", "Avg. cost", "Stock value", "Status", "Actions"].map((header) => (
                        <th key={header} className="px-3 py-3 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockQuery.isLoading ? (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={9}>Loading stock…</td></tr>
                    ) : filteredStockRows.length ? (
                      filteredStockRows.map((item) => (
                        <tr key={item.itemId} className="border-b last:border-0">
                          <td className="px-3 py-3 font-mono text-xs">{item.sku}</td>
                          <td className="px-3 py-3 font-medium">
                            {item.name}
                            <div className="text-xs text-muted-foreground">{item.unit}</div>
                          </td>
                          <td className="px-3 py-3">{item.category}</td>
                          <td className="px-3 py-3 tabular-nums">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-3 tabular-nums">{item.reorderLevel} {item.unit}</td>
                          <td className="px-3 py-3">{money(item.averageUnitCost)}</td>
                          <td className="px-3 py-3">{money(item.stockValue)}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              !item.isActive
                                ? "bg-slate-100 text-slate-600"
                                : item.lowStock
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {!item.isActive ? "Inactive" : item.lowStock ? "Low stock" : "In stock"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditItem(item)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={9}>{itemSearch ? "No items match this search." : "No inventory items yet. Add items to start tracking stock."}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Purchase management</CardTitle>
                <CardDescription>
                  Draft orders can be placed, partially received, or cancelled before receipt.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={orderStatus} onValueChange={selectOrderStatus}>
                  <SelectTrigger className="w-44 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All order statuses</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="PartiallyReceived">Partially received</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={openOrderDialog} disabled={!societyId || !activeSuppliers.length || !activeItems.length}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create purchase order
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!activeSuppliers.length ? (
                <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  Add an active supplier before creating purchase orders.
                </p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="list-table">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      {["Order", "Supplier", "Created", "Expected", "Items", "Total", "Status", "Actions"].map((header) => (
                        <th key={header} className="px-3 py-3 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ordersQuery.isLoading ? (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>Loading purchase orders…</td></tr>
                    ) : orders.length ? (
                      orders.map((order) => {
                        const total = order.lines.reduce(
                          (sum, line) => sum + line.orderedQuantity * line.unitCost,
                          0,
                        );
                        return (
                          <tr key={order._id} className="border-b last:border-0">
                            <td className="px-3 py-3 font-mono text-xs">{order.orderNumber}</td>
                            <td className="px-3 py-3">{referenceLabel(order.supplierId, "Supplier")}</td>
                            <td className="px-3 py-3">{dateOnly(order.createdAt)}</td>
                            <td className="px-3 py-3">{dateOnly(order.expectedAt)}</td>
                            <td className="px-3 py-3">{order.lines.length}</td>
                            <td className="px-3 py-3">{money(total)}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                order.status === "Received"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : order.status === "PartiallyReceived"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "Cancelled"
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-amber-100 text-amber-800"
                              }`}>
                                {order.status === "PartiallyReceived" ? "Partially received" : order.status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {order.status === "Draft" ? (
                                  <Button type="button" size="sm" variant="outline" onClick={async () => {
                                    try {
                                      await placeOrder(order._id).unwrap();
                                      toast.success("Purchase order placed.");
                                    } catch (error) {
                                      toast.error(errorMessage(error));
                                    }
                                  }}>
                                    <Truck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                    Place
                                  </Button>
                                ) : null}
                                {order.status === "Ordered" || order.status === "PartiallyReceived" ? (
                                  <Button type="button" size="sm" variant="outline" onClick={() => openReceiveDialog(order)}>
                                    Receive
                                  </Button>
                                ) : null}
                                {order.status === "Draft" || order.status === "Ordered" ? (
                                  <Button type="button" size="sm" variant="ghost" onClick={async () => {
                                    try {
                                      await cancelOrder(order._id).unwrap();
                                      toast.success("Purchase order cancelled.");
                                    } catch (error) {
                                      toast.error(errorMessage(error));
                                    }
                                  }}>
                                    Cancel
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>No purchase orders for this society.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pager
                page={orderPage}
                totalPages={orderResponse?.meta.totalPages ?? 0}
                onChange={setOrderPage}
                disabled={ordersQuery.isFetching}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Maintain supplier contacts for purchasing.</CardDescription>
              </div>
              <Button type="button" onClick={openNewSupplier}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add supplier
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="list-table">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      {["Supplier", "Contact", "Phone", "Email", "Address", "Status", "Actions"].map((header) => (
                        <th key={header} className="px-3 py-3 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersQuery.isLoading ? (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>Loading suppliers…</td></tr>
                    ) : suppliers.length ? (
                      suppliers.map((supplier) => (
                        <tr key={supplier._id} className="border-b last:border-0">
                          <td className="px-3 py-3 font-medium">{supplier.name}</td>
                          <td className="px-3 py-3">{supplier.contactName || "—"}</td>
                          <td className="px-3 py-3">{supplier.phone || "—"}</td>
                          <td className="px-3 py-3">{supplier.email || "—"}</td>
                          <td className="max-w-56 truncate px-3 py-3">{supplier.address || "—"}</td>
                          <td className="px-3 py-3">{supplier.isActive ? "Active" : "Inactive"}</td>
                          <td className="px-3 py-3">
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditSupplier(supplier)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>No suppliers yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Stock movement ledger</CardTitle>
                <CardDescription>
                  Receipts, purchases, consumption, and adjustments are recorded with before/after balances.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={ledgerItemId || "all"} onValueChange={selectLedgerItem}>
                  <SelectTrigger className="w-52 bg-white">
                    <SelectValue placeholder="All items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.sku} · {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={exportLedger} disabled={!ledgerResponse}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export this page
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="list-table">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      {["Date", "Item", "Movement", "Change", "Before", "After", "Unit cost", "Note"].map((header) => (
                        <th key={header} className="px-3 py-3 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerQuery.isLoading ? (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>Loading stock ledger…</td></tr>
                    ) : ledgerEntries.length ? (
                      ledgerEntries.map((entry) => (
                        <tr key={entry._id} className="border-b last:border-0">
                          <td className="px-3 py-3">{dateOnly(entry.createdAt)}</td>
                          <td className="px-3 py-3">
                            {typeof entry.itemId === "object" ? entry.itemId.name : "Inventory item"}
                            <div className="text-xs text-muted-foreground">
                              {typeof entry.itemId === "object" ? entry.itemId.sku : ""}
                            </div>
                          </td>
                          <td className="px-3 py-3">{entry.type}</td>
                          <td className={`px-3 py-3 tabular-nums ${entry.quantityDelta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {entry.quantityDelta > 0 ? "+" : ""}{entry.quantityDelta}
                          </td>
                          <td className="px-3 py-3 tabular-nums">{entry.quantityBefore}</td>
                          <td className="px-3 py-3 tabular-nums">{entry.quantityAfter}</td>
                          <td className="px-3 py-3">{money(entry.unitCost)}</td>
                          <td className="max-w-64 truncate px-3 py-3">{entry.note || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>No stock movements recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pager
                page={ledgerPage}
                totalPages={ledgerResponse?.meta.totalPages ?? 0}
                onChange={setLedgerPage}
                disabled={ledgerQuery.isFetching}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
            <DialogDescription>Define the reusable product and its default reorder threshold.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveItem} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="inventory-sku">SKU</Label>
                <Input id="inventory-sku" required maxLength={40} value={itemForm.sku} onChange={(event) => setItemForm({ ...itemForm, sku: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inventory-name">Name</Label>
                <Input id="inventory-name" required maxLength={120} value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inventory-category">Category</Label>
                <Input id="inventory-category" required maxLength={80} value={itemForm.category} onChange={(event) => setItemForm({ ...itemForm, category: event.target.value })} placeholder="Cleaning chemical, tools…" />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={itemForm.unit} onValueChange={(value) => setItemForm({ ...itemForm, unit: value as ItemForm["unit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {inventoryUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inventory-cost">Default unit cost (₹)</Label>
                <Input id="inventory-cost" type="number" min="0" step="0.01" value={itemForm.defaultUnitCost} onChange={(event) => setItemForm({ ...itemForm, defaultUnitCost: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inventory-reorder">Low-stock threshold</Label>
                <Input id="inventory-reorder" type="number" min="0" step="0.001" value={itemForm.reorderLevel} onChange={(event) => setItemForm({ ...itemForm, reorderLevel: event.target.value })} />
              </div>
            </div>
            {selectedItem ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={itemForm.isActive} onChange={(event) => setItemForm({ ...itemForm, isActive: event.target.checked })} />
                Item active
              </label>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetItemDialog}>Cancel</Button>
              <Button type="submit">{selectedItem ? "Save item" : "Create item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSupplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>Supplier details are available to all society purchase orders.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSupplier} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-name">Supplier name</Label>
                <Input id="supplier-name" required maxLength={120} value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-contact">Contact person</Label>
                <Input id="supplier-contact" value={supplierForm.contactName} onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input id="supplier-phone" value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input id="supplier-email" type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="supplier-address">Address</Label>
                <Input id="supplier-address" value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} />
              </div>
            </div>
            {selectedSupplier ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={supplierForm.isActive} onChange={(event) => setSupplierForm({ ...supplierForm, isActive: event.target.checked })} />
                Supplier active
              </label>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{selectedSupplier ? "Save supplier" : "Create supplier"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record stock movement</DialogTitle>
            <DialogDescription>
              Consumption reduces available stock; adjustments may add or remove a correction quantity.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStockTransaction} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Item</Label>
              <Select value={stockForm.itemId} onValueChange={(value) => setStockForm({ ...stockForm, itemId: value })}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {activeItems.map((item) => <SelectItem key={item._id} value={item._id}>{item.sku} · {item.name} ({item.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Movement</Label>
                <Select value={stockForm.type} onValueChange={(value) => setStockForm({ ...stockForm, type: value as StockForm["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consumption">Consumption / issue</SelectItem>
                    <SelectItem value="Receipt">Manual receipt</SelectItem>
                    <SelectItem value="Adjustment">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock-quantity">
                  Quantity {stockForm.type === "Adjustment" ? "(negative to remove)" : ""}
                </Label>
                <Input id="stock-quantity" type="number" step="0.001" required min={stockForm.type === "Adjustment" ? undefined : "0.001"} value={stockForm.quantity} onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })} />
              </div>
              {stockForm.type === "Receipt" ? (
                <div className="grid gap-2">
                  <Label htmlFor="stock-unit-cost">Unit cost (₹, optional)</Label>
                  <Input id="stock-unit-cost" type="number" min="0" step="0.01" value={stockForm.unitCost} onChange={(event) => setStockForm({ ...stockForm, unitCost: event.target.value })} />
                </div>
              ) : null}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="stock-note">Reason / note</Label>
                <Input id="stock-note" maxLength={500} required value={stockForm.note} onChange={(event) => setStockForm({ ...stockForm, note: event.target.value })} placeholder="e.g. daily chemical issue, damaged bottle…" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Record movement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create purchase order</DialogTitle>
            <DialogDescription>
              Creates a draft for the selected society. Place it before recording a delivery.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitOrder} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Select value={orderSupplierId} onValueChange={setOrderSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {activeSuppliers.map((supplier) => <SelectItem key={supplier._id} value={supplier._id}>{supplier.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-expected">Expected delivery</Label>
                <Input id="order-expected" type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Order items</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => setOrderLines((current) => [...current, newOrderLine()])}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add line
                </Button>
              </div>
              {orderLines.map((line, index) => (
                <div key={`order-line-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_auto]">
                  <div className="grid gap-2">
                    <Label>Item</Label>
                    <Select value={line.itemId} onValueChange={(itemId) => {
                      const item = activeItems.find((candidate) => candidate._id === itemId);
                      setOrderLine(index, {
                        itemId,
                        unitCost: String(item?.defaultUnitCost ?? 0),
                      });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {activeItems.map((item) => <SelectItem key={item._id} value={item._id}>{item.sku} · {item.name} ({item.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`order-quantity-${index}`}>Quantity</Label>
                    <Input id={`order-quantity-${index}`} type="number" min="0.001" step="0.001" required value={line.quantity} onChange={(event) => setOrderLine(index, { quantity: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`order-cost-${index}`}>Unit cost (₹)</Label>
                    <Input id={`order-cost-${index}`} type="number" min="0" step="0.01" required value={line.unitCost} onChange={(event) => setOrderLine(index, { unitCost: event.target.value })} />
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="self-end" disabled={orderLines.length === 1} onClick={() => setOrderLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order-notes">Notes</Label>
              <Input id="order-notes" maxLength={1000} value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save draft order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiveTarget)} onOpenChange={(open) => {
        if (!open) setReceiveTarget(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive purchase order</DialogTitle>
            <DialogDescription>
              Enter delivered quantities. Partial receipts are supported and stock updates are audited.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReceipt} className="grid gap-4">
            {receiveTarget?.lines
              .filter((line) => line.orderedQuantity > line.receivedQuantity)
              .map((line) => (
                <div key={line._id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
                  <div className="text-sm">
                    <p className="font-medium">{line.itemNameSnapshot} · {line.skuSnapshot}</p>
                    <p className="text-xs text-muted-foreground">
                      Outstanding: {line.orderedQuantity - line.receivedQuantity} {line.unitSnapshot}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`receive-${line._id}`}>Received</Label>
                    <Input id={`receive-${line._id}`} type="number" min="0" max={line.orderedQuantity - line.receivedQuantity} step="0.001" value={receiveQuantities[line.itemId] ?? "0"} onChange={(event) => setReceiveQuantities((current) => ({ ...current, [line.itemId]: event.target.value }))} />
                  </div>
                </div>
              ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceiveTarget(null)}>Cancel</Button>
              <Button type="submit">Record receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

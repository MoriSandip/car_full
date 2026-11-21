import {RefreshCw} from "lucide-react";
import {useState} from "react";
import ListPagination from "@/components/ListPagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetMyCashTransactionsQuery,
  type WorkerCashTransaction,
} from "@/redux/features/worker/workerApi";

const formatMoney = (amount: number) =>
  `₹${Number(amount || 0).toFixed(2)}`;

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const statusClass: Record<WorkerCashTransaction["status"], string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Failed: "bg-rose-100 text-rose-700",
  Refunded: "bg-violet-100 text-violet-700",
};

const WorkerCashTransactions = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<
    "" | WorkerCashTransaction["status"]
  >("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const {data, isLoading, isFetching, isError, refetch} =
    useGetMyCashTransactionsQuery({
      page,
      limit: 20,
      ...(status ? {status} : {}),
      ...(from ? {from} : {}),
      ...(to ? {to} : {}),
    });
  const summary = data?.meta?.summary;
  const totalPages = Math.max(1, data?.meta?.totalPages ?? 1);
  const transactions = data?.data ?? [];

  return (
    <main className="space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cash transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cash collections recorded for your assigned bookings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh cash transactions"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Cash received", formatMoney(summary?.paidAmount ?? 0)],
          ["Transactions", summary?.transactionCount ?? 0],
          ["Refunded", formatMoney(summary?.refundedAmount ?? 0)],
        ].map(([label, value]) => (
          <Card key={String(label)} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-slate-900">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>My cash report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-500">
              Status
              <select
                value={status}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatus(
                    value === "Pending" ||
                      value === "Paid" ||
                      value === "Failed" ||
                      value === "Refunded"
                      ? value
                      : "",
                  );
                  setPage(1);
                }}
                className="h-10 min-w-40 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                <option value="">All statuses</option>
                <option value="Paid">Received</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-500">
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-500">
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              />
            </label>
          </div>

          {isError ? (
            <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
              Cash transactions could not be loaded. Refresh and try again.
            </p>
          ) : isLoading ? (
            <p className="p-4 text-sm text-slate-500">
              Loading your cash transactions...
            </p>
          ) : transactions.length ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Received</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Recorded by</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const vehicle = [
                        transaction.bookingId?.carId?.registrationNumber,
                        transaction.bookingId?.carId?.make,
                        transaction.bookingId?.carId?.model,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <TableRow key={transaction._id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(
                              transaction.verifiedAt || transaction.createdAt,
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {transaction.customerId?.name || "Customer"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {transaction.customerId?.phone ||
                                transaction.customerId?.email ||
                                ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {transaction.bookingId?.serviceNameSnapshot ||
                                "Car wash"}
                            </div>
                            {transaction.bookingId ? (
                              <div className="text-xs text-slate-500">
                                {formatDateTime(
                                  transaction.bookingId.bookingDate,
                                )}{" "}
                                · {transaction.bookingId.bookingTime}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{vehicle || "—"}</TableCell>
                          <TableCell>
                            {transaction.recordedByWorker?.name ||
                              transaction.recordedBy?.name ||
                              "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold">
                            {formatMoney(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[transaction.status]}`}
                            >
                              {transaction.status === "Paid"
                                ? "Received"
                                : transaction.status}
                            </span>
                          </TableCell>
                          <TableCell>{transaction.reference || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <ListPagination
                page={data?.meta?.page ?? page}
                totalPages={totalPages}
                totalItems={data?.meta?.total ?? 0}
                pageSize={20}
                isLoading={isFetching}
                itemLabel="transactions"
                onPageChange={setPage}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="font-semibold text-slate-800">
                No cash transactions found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cash collections recorded for your assigned bookings will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default WorkerCashTransactions;

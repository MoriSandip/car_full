import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetSocietiesQuery } from "@/redux/features/society/societyApi";
import {
  type ReportAnalytics,
  type ReportBooking,
  type ReportFilters,
  useGetReportAnalyticsQuery,
  useGetReportBookingsQuery,
  useLazyGetReportBookingsQuery,
} from "@/redux/features/report/reportApi";

const pageSize = 50;
const maxExportRows = 20_000;
const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type SocietyOption = { _id: string; name: string };
type CsvCell = string | number | null | undefined;

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthStartKey = () => {
  const date = new Date();
  date.setDate(1);
  return localDateKey(date);
};

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const referenceName = (
  value: string | { name?: string; registrationNumber?: string } | undefined,
  fallback: string,
) => {
  if (!value) return fallback;
  if (typeof value === "string") return fallback;
  return value.name || value.registrationNumber || fallback;
};

const csvValue = (value: CsvCell) => {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: CsvCell[][]) => {
  const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = data.message;
      if (typeof message === "string") return message;
    }
  }
  return "Could not export the booking report.";
};

const getSocietyOptions = (value: unknown): SocietyOption[] => {
  if (typeof value !== "object" || value === null) return [];
  const response = value as Record<string, unknown>;
  const payload = response.data;
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is SocietyOption =>
        typeof item === "object" &&
        item !== null &&
        "_id" in item &&
        "name" in item &&
        typeof item._id === "string" &&
        typeof item.name === "string",
    );
  }
  if (typeof payload === "object" && payload !== null) {
    const nested = payload as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data.filter(
        (item): item is SocietyOption =>
          typeof item === "object" &&
          item !== null &&
          "_id" in item &&
          "name" in item &&
          typeof item._id === "string" &&
          typeof item.name === "string",
      );
    }
  }
  if (Array.isArray(response.result)) {
    return response.result.filter(
      (item): item is SocietyOption =>
        typeof item === "object" &&
        item !== null &&
        "_id" in item &&
        "name" in item &&
        typeof item._id === "string" &&
        typeof item.name === "string",
    );
  }
  return [];
};

function Metric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        {caption ? (
          <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TableCard({
  title,
  description,
  headers,
  rows,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="list-table">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${title}-${index}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${title}-${index}-${cellIndex}`} className="px-3 py-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No data for this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const createAnalyticsCsv = (report: ReportAnalytics): CsvCell[][] => {
  const { summary } = report;
  const rows: CsvCell[][] = [
    ["Reports & Analytics", `From ${report.range.from} to ${report.range.to}`],
    ["Metric", "Value"],
    ["Total bookings", summary.totalBookings],
    ["Pending bookings", summary.pendingBookings],
    ["Confirmed bookings", summary.confirmedBookings],
    ["In-progress bookings", summary.inProgressBookings],
    ["Completed bookings", summary.completedBookings],
    ["Cancelled bookings", summary.cancelledBookings],
    ["Paid booking value", summary.paidBookingValue],
    ["Collected revenue", summary.collectedRevenue],
    ["Refunded amount", summary.refundedAmount],
    ["Successful payments", summary.successfulPayments],
    [],
    ["Daily bookings"],
    ["Date", "Bookings", "Completed"],
    ...report.dailyBookings.map((row) => [row.date, row.bookings, row.completed]),
    [],
    ["Daily collected revenue"],
    ["Date", "Amount", "Transactions"],
    ...report.dailyRevenue.map((row) => [row.date, row.amount, row.transactions]),
    [],
    ["Service performance"],
    ["Service", "Bookings", "Completed", "Paid booking value"],
    ...report.servicePerformance.map((row) => [
      row.service,
      row.bookings,
      row.completed,
      row.paidAmount,
    ]),
    [],
    ["Society performance"],
    ["Society", "Bookings", "Completed", "Paid booking value"],
    ...report.societyPerformance.map((row) => [
      row.society,
      row.bookings,
      row.completed,
      row.paidAmount,
    ]),
    [],
    ["Worker performance"],
    ["Worker", "Bookings", "Completed", "Average rating", "Working hours"],
    ...report.workerPerformance.map((row) => [
      row.worker,
      row.bookings,
      row.completed,
      row.averageRating.toFixed(2),
      (row.workingSeconds / 3600).toFixed(2),
    ]),
    [],
    ["Payment channels"],
    ["Provider", "Transactions", "Amount"],
    ...report.paymentMethods.map((row) => [
      row.provider,
      row.transactions,
      row.amount,
    ]),
    [],
    ["Revenue by transaction type"],
    ["Type", "Transactions", "Amount"],
    ...report.revenueByType.map((row) => [
      row.type,
      row.transactions,
      row.amount,
    ]),
  ];
  return rows;
};

const bookingCsvRows = (bookings: ReportBooking[]): CsvCell[][] => [
  [
    "Booking date",
    "Time",
    "Society",
    "Service",
    "Car",
    "Worker",
    "Status",
    "Payment type",
    "Payment status",
    "Payment method",
    "Amount",
  ],
  ...bookings.map((booking) => [
    booking.bookingDate.slice(0, 10),
    booking.bookingTime,
    referenceName(booking.societyId, ""),
    booking.serviceNameSnapshot,
    referenceName(booking.carId, ""),
    referenceName(booking.workerId, "Unassigned"),
    booking.status,
    booking.paymentType,
    booking.paymentStatus,
    booking.paymentMethod ?? "",
    booking.amountPayable,
  ]),
];

export default function ReportsAnalytics() {
  const [from, setFrom] = useState(monthStartKey);
  const [to, setTo] = useState(() => localDateKey(new Date()));
  const [societyId, setSocietyId] = useState("");
  const [page, setPage] = useState(1);
  const [isExportingBookings, setIsExportingBookings] = useState(false);
  const filters = useMemo<ReportFilters>(
    () => ({ from, to, societyId: societyId || undefined }),
    [from, to, societyId],
  );
  const societiesQuery = useGetSocietiesQuery();
  const analyticsQuery = useGetReportAnalyticsQuery(filters, {
    skip: !from || !to,
  });
  const bookingsQuery = useGetReportBookingsQuery(
    { ...filters, page, limit: pageSize },
    { skip: !from || !to },
  );
  const [fetchBookings] = useLazyGetReportBookingsQuery();
  const societies = getSocietyOptions(societiesQuery.data);
  const analytics = analyticsQuery.currentData?.data;
  const bookingsPage = bookingsQuery.currentData?.data;
  const bookings = bookingsPage?.data ?? [];
  const summary = analytics?.summary;
  const bookingStatuses = summary
    ? [
        { name: "Pending", value: summary.pendingBookings },
        { name: "Confirmed", value: summary.confirmedBookings },
        { name: "In progress", value: summary.inProgressBookings },
        { name: "Completed", value: summary.completedBookings },
        { name: "Cancelled", value: summary.cancelledBookings },
      ]
    : [];
  const dateRangeError = Boolean(from && to && to < from);
  const requestError = analyticsQuery.isError || bookingsQuery.isError;

  const exportAnalytics = () => {
    if (!analytics) return;
    downloadCsv(
      `reports-analytics-${from}-to-${to}.csv`,
      createAnalyticsCsv(analytics),
    );
    toast.success("Analytics CSV exported.");
  };

  const exportBookings = async () => {
    if (!bookingsPage) return;
    if (bookingsPage.meta.total > maxExportRows) {
      toast.error(
        `This export contains ${bookingsPage.meta.total.toLocaleString("en-IN")} rows. Narrow the date range to export up to ${maxExportRows.toLocaleString("en-IN")} rows at once.`,
      );
      return;
    }

    setIsExportingBookings(true);
    try {
      const allBookings: ReportBooking[] = [];
      const exportPageCount = Math.ceil(bookingsPage.meta.total / 500);
      for (let nextPage = 1; nextPage <= exportPageCount; nextPage += 1) {
        const result = await fetchBookings({
          ...filters,
          page: nextPage,
          limit: 500,
        }).unwrap();
        allBookings.push(...result.data.data);
      }
      downloadCsv(
        `booking-report-${from}-to-${to}.csv`,
        bookingCsvRows(allBookings),
      );
      toast.success(`${allBookings.length.toLocaleString("en-IN")} bookings exported.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsExportingBookings(false);
    }
  };

  return (
    <main className="space-y-6 px-4 py-4 sm:px-6 lg:px-14">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Booking trends, recorded revenue, society and worker performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={exportBookings}
            disabled={!bookingsPage || bookingsPage.meta.total === 0 || isExportingBookings}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {isExportingBookings ? "Preparing bookings…" : "Export bookings CSV"}
          </Button>
          <Button
            type="button"
            onClick={exportAnalytics}
            disabled={!analytics}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export analytics CSV
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="grid gap-1 text-sm font-medium">
          From
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          To
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Society
          <select
            value={societyId}
            onChange={(event) => {
              setSocietyId(event.target.value);
              setPage(1);
            }}
            className="h-10 min-w-48 rounded-md border bg-white px-3"
          >
            <option value="">All societies</option>
            {societies.map((society) => (
              <option key={society._id} value={society._id}>
                {society.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void Promise.all([
              analyticsQuery.refetch(),
              bookingsQuery.refetch(),
              societiesQuery.refetch(),
            ]);
          }}
          disabled={analyticsQuery.isFetching || bookingsQuery.isFetching}
          className="h-10"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-auto sm:max-w-64">
          Up to 366 days per report. Revenue uses payment transactions recorded within this date range.
        </p>
      </section>

      {societiesQuery.isError ? (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Could not load the society filter.
        </p>
      ) : null}
      {dateRangeError ? (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          The end date must be on or after the start date.
        </p>
      ) : null}
      {requestError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Could not load report data. Refresh to try again.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void Promise.all([analyticsQuery.refetch(), bookingsQuery.refetch()]);
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {analyticsQuery.isLoading || (analyticsQuery.isFetching && !analytics) ? (
        <p className="rounded-md border bg-white p-6 text-center text-sm text-muted-foreground">
          Loading reports…
        </p>
      ) : null}

      {analytics && summary ? (
        <>
          <section aria-label="Report summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Bookings" value={summary.totalBookings} caption="In selected period" />
            <Metric label="Completed" value={summary.completedBookings} caption={`${summary.cancelledBookings} cancelled`} />
            <Metric label="Collected revenue" value={money(summary.collectedRevenue)} caption={`${summary.successfulPayments} successful payments`} />
            <Metric label="Refunded" value={money(summary.refundedAmount)} caption="Refunded transactions" />
            <Metric label="Paid booking value" value={money(summary.paidBookingValue)} caption="Paid booking records" />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily booking activity</CardTitle>
                <CardDescription>Scheduled washes and completed bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dailyBookings}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={24} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(label) => dateLabel(String(label))} />
                      <Legend />
                      <Bar dataKey="bookings" name="Bookings" fill={chartColors[0]} />
                      <Bar dataKey="completed" name="Completed" fill={chartColors[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collected revenue trend</CardTitle>
                <CardDescription>Successful payments recorded per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={24} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => dateLabel(String(label))}
                        formatter={(value) => [money(Number(value)), "Revenue"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Revenue"
                        stroke={chartColors[1]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Booking status</CardTitle>
                <CardDescription>Selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bookingStatuses} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                        {bookingStatuses.map((status, index) => (
                          <Cell key={status.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="xl:col-span-2 grid gap-6 lg:grid-cols-2">
              <TableCard
                title="Payment channels"
                description="Successful transactions by provider"
                headers={["Provider", "Payments", "Amount"]}
                rows={analytics.paymentMethods.map((row) => [
                  row.provider,
                  row.transactions,
                  money(row.amount),
                ])}
              />
              <TableCard
                title="Revenue by type"
                description="Booking and membership payments"
                headers={["Type", "Payments", "Amount"]}
                rows={analytics.revenueByType.map((row) => [
                  row.type,
                  row.transactions,
                  money(row.amount),
                ])}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <TableCard
              title="Society performance"
              description="Booking volume and paid booking value by society"
              headers={["Society", "Bookings", "Completed", "Paid value"]}
              rows={analytics.societyPerformance.map((row) => [
                row.society,
                row.bookings,
                row.completed,
                money(row.paidAmount),
              ])}
            />
            <TableCard
              title="Service performance"
              description="Popular services and completed washes"
              headers={["Service", "Bookings", "Completed", "Paid value"]}
              rows={analytics.servicePerformance.map((row) => [
                row.service || "Wash service",
                row.bookings,
                row.completed,
                money(row.paidAmount),
              ])}
            />
          </section>

          <TableCard
            title="Worker performance"
            description="Assigned bookings, completed washes, ratings and recorded work hours"
            headers={["Worker", "Bookings", "Completed", "Avg. rating", "Hours"]}
            rows={analytics.workerPerformance.map((row) => [
              row.worker,
              row.bookings,
              row.completed,
              row.averageRating ? row.averageRating.toFixed(2) : "—",
              (row.workingSeconds / 3600).toFixed(1),
            ])}
          />
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Booking detail report</CardTitle>
            <CardDescription>
              {bookingsPage
                ? `${bookingsPage.meta.total.toLocaleString("en-IN")} bookings in the selected report`
                : "Detailed bookings with payment and assignment status"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || bookingsQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {Math.max(1, bookingsPage?.meta.totalPages ?? 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (bookingsPage?.meta.totalPages ?? 1) || bookingsQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="list-table">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  {["Date", "Society", "Service", "Car", "Worker", "Status", "Payment", "Amount"].map((header) => (
                    <th key={header} className="px-3 py-3 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookingsQuery.isLoading ? (
                  <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>Loading booking report…</td></tr>
                ) : bookings.length ? (
                  bookings.map((booking) => (
                    <tr key={booking._id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        {dateLabel(booking.bookingDate.slice(0, 10))}
                        <div className="text-xs text-muted-foreground">{booking.bookingTime}</div>
                      </td>
                      <td className="px-3 py-3">{referenceName(booking.societyId, "—")}</td>
                      <td className="px-3 py-3">{booking.serviceNameSnapshot}</td>
                      <td className="px-3 py-3">{referenceName(booking.carId, "—")}</td>
                      <td className="px-3 py-3">{referenceName(booking.workerId, "Unassigned")}</td>
                      <td className="px-3 py-3">{booking.status}</td>
                      <td className="px-3 py-3">
                        {booking.paymentStatus}
                        <div className="text-xs text-muted-foreground">
                          {booking.paymentMethod || booking.paymentType}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(booking.amountPayable)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>No bookings found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

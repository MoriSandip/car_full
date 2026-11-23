import { useMemo, useState } from "react";
import {
  useGeneratePayrollMutation,
  useGetAdminLeavesQuery,
  useGetPayrollQuery,
  useGetWorkersQuery,
  useReviewLeaveMutation,
  useUpdatePayrollMutation,
  type WorkerLeaveRequest,
} from "@/redux/features/worker/workerApi";

const today = new Date();
const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthStart = dateInputValue(new Date(today.getFullYear(), today.getMonth() - 1, 1));
const monthEnd = dateInputValue(new Date(today.getFullYear(), today.getMonth(), 0));
const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const relatedName = (
  value: string | { name?: string; registrationNumber?: string } | undefined,
) =>
  typeof value === "string"
    ? value
    : value?.name ?? value?.registrationNumber ?? "—";

export default function LeavePayroll() {
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [replacementWorkers, setReplacementWorkers] = useState<Record<string, string>>({});
  const [leaveError, setLeaveError] = useState("");
  const [payrollError, setPayrollError] = useState("");
  const [paymentReference, setPaymentReference] = useState<Record<string, string>>({});
  const [reviewTypes, setReviewTypes] = useState<Record<string, "Paid" | "Unpaid">>({});
  const leavesQuery = useGetAdminLeavesQuery();
  const payrollQuery = useGetPayrollQuery();
  const workersQuery = useGetWorkersQuery({ status: "ACTIVE", limit: 1000 });
  const [reviewLeave, reviewState] = useReviewLeaveMutation();
  const [generatePayroll, generateState] = useGeneratePayrollMutation();
  const [updatePayroll, updateState] = useUpdatePayrollMutation();
  const leaves = useMemo(() => leavesQuery.data ?? [], [leavesQuery.data]);
  const payroll = payrollQuery.data ?? [];
  const pendingLeaves = useMemo(
    () => leaves.filter((leave) => leave.status === "Pending"),
    [leaves],
  );

  const decideLeave = async (
    leave: WorkerLeaveRequest,
    decision: "Approved" | "Rejected",
  ) => {
    setLeaveError("");
    const assignments = (leave.affectedBookings ?? []).map((booking) => ({
      bookingId: booking._id,
      workerId: replacementWorkers[booking._id] ?? "",
    }));
    if (decision === "Approved" && assignments.some((assignment) => !assignment.workerId)) {
      setLeaveError("Select an active replacement worker for every affected booking before approval.");
      return;
    }
    try {
      await reviewLeave({
        id: leave._id,
        decision,
        leaveType: reviewTypes[leave._id] ?? leave.leaveType,
        reassignments: decision === "Approved" ? assignments : [],
      }).unwrap();
    } catch (error) {
      const response = error as { data?: { message?: string } };
      setLeaveError(response.data?.message || "Leave request could not be reviewed.");
    }
  };

  const createPayroll = async () => {
    setPayrollError("");
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      setPayrollError("Choose a valid payroll date range.");
      return;
    }
    try {
      await generatePayroll({ periodStart, periodEnd }).unwrap();
    } catch (error) {
      const response = error as { data?: { message?: string } };
      setPayrollError(response.data?.message || "Payroll could not be generated.");
    }
  };

  const changePayroll = async (id: string, action: "approve" | "pay") => {
    setPayrollError("");
    try {
      await updatePayroll({
        id,
        action,
        ...(action === "pay" && paymentReference[id]
          ? { paymentReference: paymentReference[id].trim() }
          : {}),
      }).unwrap();
    } catch (error) {
      const response = error as { data?: { message?: string } };
      setPayrollError(response.data?.message || "Payroll status could not be updated.");
    }
  };

  return (
    <main className="space-y-8 px-4 py-5 sm:px-6 lg:px-14">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Leave & Payroll</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review multi-day leave, reassign affected bookings, generate custom-period payroll and record payouts.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Leave approvals</h2>
          <p className="text-sm text-slate-500">Approved leave is reflected in payroll. All active bookings during leave must be reassigned.</p>
        </div>
        {leaveError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{leaveError}</p> : null}
        {leavesQuery.isLoading ? <p>Loading leave requests…</p> : null}
        {leavesQuery.isError ? <p role="alert" className="text-sm text-red-700">Could not load leave requests.</p> : null}
        {!pendingLeaves.length && !leavesQuery.isLoading ? <p className="text-sm text-slate-500">No pending leave requests.</p> : null}
        {pendingLeaves.map((leave) => (
          <article key={leave._id} className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{relatedName(leave.workerId)}</h3>
                <p className="text-sm text-slate-600">
                  {leave.startDate} – {leave.endDate}
                  {leave.halfDay ? " · Half day" : " · Full day"} · {leave.leaveType} leave
                </p>
                <p className="mt-1 text-sm">{leave.reason}</p>
              </div>
              <label className="grid max-w-xs gap-1 text-sm font-medium">
                Approved leave treatment
                <select
                  value={reviewTypes[leave._id] ?? leave.leaveType}
                  onChange={(event) => setReviewTypes((old) => ({
                    ...old,
                    [leave._id]: event.target.value as "Paid" | "Unpaid",
                  }))}
                  className="h-10 rounded-md border bg-white px-3"
                >
                  <option value="Paid">Paid leave</option>
                  <option value="Unpaid">Unpaid leave</option>
                </select>
              </label>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending</span>
            </div>
            {(leave.affectedBookings ?? []).length ? (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-semibold">Bookings that need reassignment</p>
                {leave.affectedBookings?.map((booking) => (
                  <div key={booking._id} className="grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-[1fr_1fr] sm:items-center">
                    <p className="text-sm">
                      {booking.bookingDate.slice(0, 10)} {booking.bookingTime} · {booking.serviceNameSnapshot}
                      {" · "}{relatedName(booking.societyId)} · {relatedName(booking.carId)}
                    </p>
                    <select
                      aria-label={`Replacement worker for ${booking.bookingDate}`}
                      className="h-10 rounded-md border bg-white px-3 text-sm"
                      value={replacementWorkers[booking._id] ?? ""}
                      onChange={(event) => setReplacementWorkers((old) => ({ ...old, [booking._id]: event.target.value }))}
                    >
                      <option value="">Select replacement worker</option>
                      {(workersQuery.data?.data ?? [])
                        .filter((worker) => worker._id !== (typeof leave.workerId === "string" ? leave.workerId : leave.workerId._id))
                        .map((worker) => <option key={worker._id} value={worker._id}>{worker.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : <p className="border-t pt-3 text-sm text-emerald-700">No active bookings conflict with this leave.</p>}
            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" disabled={reviewState.isLoading} onClick={() => void decideLeave(leave, "Rejected")} className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50">Reject</button>
              <button type="button" disabled={reviewState.isLoading || workersQuery.isLoading} onClick={() => void decideLeave(leave, "Approved")} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve & reassign</button>
            </div>
          </article>
        ))}
        <div className="border-t pt-4">
          <h3 className="mb-3 font-semibold">Recent requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Worker</th><th className="p-2">Dates</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Review note</th></tr></thead>
              <tbody className="divide-y">
                {leaves.filter((leave) => leave.status !== "Pending").map((leave) => (
                  <tr key={leave._id}><td className="p-2">{relatedName(leave.workerId)}</td><td className="p-2">{leave.startDate} – {leave.endDate}</td><td className="p-2">{leave.leaveType}{leave.halfDay ? " · Half day" : ""}</td><td className="p-2">{leave.status}</td><td className="p-2">{leave.reviewNote || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Payroll runs & payslips</h2>
          <p className="text-sm text-slate-500">Base pay is monthly salary prorated by actual calendar days. Weekday absences and unpaid leave are deducted; overtime above 8h/day is paid at 1.5×.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Period start<input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="h-10 rounded-md border px-3" /></label>
          <label className="grid gap-1 text-sm">Period end<input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="h-10 rounded-md border px-3" /></label>
          <button type="button" onClick={() => void createPayroll()} disabled={generateState.isLoading} className="h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{generateState.isLoading ? "Generating…" : "Generate payroll"}</button>
        </div>
        {payrollError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{payrollError}</p> : null}
        {payrollQuery.isLoading ? <p>Loading payroll…</p> : null}
        {payrollQuery.isError ? <p role="alert" className="text-sm text-red-700">Could not load payroll records.</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Worker</th><th className="p-3">Period</th><th className="p-3">Base</th><th className="p-3">Absent</th><th className="p-3">Leave</th><th className="p-3">OT pay</th><th className="p-3">Deductions</th><th className="p-3">Net pay</th><th className="p-3">Status / action</th></tr></thead>
            <tbody className="divide-y">
              {payroll.map((record) => (
                <tr key={record._id}>
                  <td className="p-3 font-medium">{relatedName(record.workerId)}</td>
                  <td className="p-3">{record.periodStart} – {record.periodEnd}</td>
                  <td className="p-3">{money(record.basePay)}</td>
                  <td className="p-3">{record.absentDays} days</td>
                  <td className="p-3">{record.paidLeaveDays} paid / {record.unpaidLeaveDays} unpaid</td>
                  <td className="p-3">{record.overtimeHours}h · {money(record.overtimePay)}</td>
                  <td className="p-3">{money(record.deductions)}</td>
                  <td className="p-3 font-semibold">{money(record.netPay)}</td>
                  <td className="space-y-2 p-3">
                    <span className="block">{record.status}</span>
                    {record.status === "Draft" ? <button type="button" disabled={updateState.isLoading} onClick={() => void changePayroll(record._id, "approve")} className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">Approve</button> : null}
                    {record.status === "Approved" ? (
                      <div className="flex gap-1">
                        <input aria-label="Payment reference" value={paymentReference[record._id] ?? ""} onChange={(event) => setPaymentReference((old) => ({ ...old, [record._id]: event.target.value }))} placeholder="Payment ref" className="h-8 w-28 rounded border px-2 text-xs" />
                        <button type="button" disabled={updateState.isLoading} onClick={() => void changePayroll(record._id, "pay")} className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Mark paid</button>
                      </div>
                    ) : null}
                    {record.status === "Paid" ? <button type="button" onClick={() => window.print()} className="rounded border px-3 py-1.5 text-xs">Print payslips</button> : null}
                  </td>
                </tr>
              ))}
              {!payroll.length && !payrollQuery.isLoading ? <tr><td className="p-6 text-center text-slate-500" colSpan={9}>No payroll records yet. Generate a date range to create payslips.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

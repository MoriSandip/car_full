import { useState } from "react";
import {
  useCancelLeaveMutation,
  useGetMyLeavesQuery,
  useGetMyPayrollQuery,
  useRequestLeaveMutation,
} from "@/redux/features/worker/workerApi";

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function WorkerLeavePayroll() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [leaveType, setLeaveType] = useState<"Paid" | "Unpaid">("Paid");
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [printId, setPrintId] = useState("");
  const leavesQuery = useGetMyLeavesQuery();
  const payrollQuery = useGetMyPayrollQuery();
  const [requestLeave, requestState] = useRequestLeaveMutation();
  const [cancelLeave, cancelState] = useCancelLeaveMutation();

  const submitLeave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await requestLeave({ startDate, endDate, leaveType, halfDay, reason: reason.trim() }).unwrap();
      setReason("");
      setHalfDay(false);
    } catch (cause) {
      const response = cause as { data?: { message?: string } };
      setError(response.data?.message || "Leave request could not be submitted.");
    }
  };
  const cancel = async (id: string) => {
    setError("");
    try {
      await cancelLeave(id).unwrap();
    } catch (cause) {
      const response = cause as { data?: { message?: string } };
      setError(response.data?.message || "Leave request could not be cancelled.");
    }
  };

  return (
    <main className="space-y-7 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Leave & Payslips</h1>
        <p className="mt-1 text-sm text-slate-600">Request single- or multi-day leave and track your monthly payroll.</p>
      </header>
      {error ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Apply for leave</h2>
        <form onSubmit={(event) => void submitLeave(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">From<input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="h-10 rounded-md border px-3" /></label>
          <label className="grid gap-1 text-sm">To<input type="date" min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="h-10 rounded-md border px-3" /></label>
          <label className="grid gap-1 text-sm">Leave type<select value={leaveType} onChange={(event) => setLeaveType(event.target.value as "Paid" | "Unpaid")} className="h-10 rounded-md border px-3"><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option></select></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={halfDay} onChange={(event) => setHalfDay(event.target.checked)} />Half-day (single date only)</label>
          <label className="grid gap-1 text-sm sm:col-span-2">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} required className="rounded-md border p-3" /></label>
          <div className="sm:col-span-2"><button type="submit" disabled={requestState.isLoading} className="rounded-md bg-sky-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{requestState.isLoading ? "Submitting…" : "Submit leave request"}</button></div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">My leave requests</h2>
        {leavesQuery.isError ? <p role="alert" className="mt-3 text-sm text-red-700">Could not load leave requests.</p> : null}
        <div className="mt-3 space-y-3">
          {(leavesQuery.data ?? []).map((leave) => (
            <div key={leave._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div><p className="font-medium">{leave.startDate} – {leave.endDate} · {leave.leaveType}{leave.halfDay ? " · Half day" : ""}</p><p className="text-sm text-slate-600">{leave.reason}</p>{leave.reviewNote ? <p className="text-sm text-slate-500">Admin: {leave.reviewNote}</p> : null}</div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{leave.status}</span>{leave.status === "Pending" ? <button type="button" disabled={cancelState.isLoading} onClick={() => void cancel(leave._id)} className="rounded border px-3 py-1.5 text-sm">Cancel</button> : null}</div>
            </div>
          ))}
          {!leavesQuery.isLoading && !leavesQuery.data?.length ? <p className="text-sm text-slate-500">No leave requests yet.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Payslips</h2>
        <p className="mt-1 text-sm text-slate-500">Only approved and paid payroll records are available as payslips.</p>
        {payrollQuery.isError ? <p role="alert" className="mt-3 text-sm text-red-700">Could not load payroll records.</p> : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(payrollQuery.data ?? []).map((payroll) => (
            <article key={payroll._id} className={`payslip-card rounded-lg border p-4 ${printId === payroll._id ? "print-active" : ""}`}>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div><h3 className="font-semibold">Payslip · {payroll.periodStart} – {payroll.periodEnd}</h3><p className="text-sm text-slate-500">{payroll.status}{payroll.paidAt ? ` · Paid ${new Date(payroll.paidAt).toLocaleDateString("en-IN")}` : ""}</p></div>
                {payroll.status === "Paid" ? <button type="button" onClick={() => { setPrintId(payroll._id); window.setTimeout(() => window.print(), 0); }} className="print:hidden rounded border px-3 py-1.5 text-sm">Print</button> : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Monthly salary</dt><dd>{money(payroll.monthlySalary)}</dd></div>
                <div><dt className="text-slate-500">Base pay</dt><dd>{money(payroll.basePay)}</dd></div>
                <div><dt className="text-slate-500">Absent days</dt><dd>{payroll.absentDays}</dd></div>
                <div><dt className="text-slate-500">Paid / unpaid leave</dt><dd>{payroll.paidLeaveDays} / {payroll.unpaidLeaveDays} days</dd></div>
                <div><dt className="text-slate-500">Overtime</dt><dd>{payroll.overtimeHours}h · {money(payroll.overtimePay)}</dd></div>
                <div><dt className="text-slate-500">Deductions</dt><dd>{money(payroll.deductions)}</dd></div>
              </dl>
              <p className="mt-4 flex justify-between border-t pt-3 font-bold"><span>Net pay</span><span>{money(payroll.netPay)}</span></p>
              {payroll.paymentReference ? <p className="mt-2 text-xs text-slate-500">Payment reference: {payroll.paymentReference}</p> : null}
            </article>
          ))}
          {!payrollQuery.isLoading && !payrollQuery.data?.length ? <p className="text-sm text-slate-500">No payslips available yet.</p> : null}
        </div>
      </section>
      <style>{`@media print { body * { visibility: hidden !important; } .payslip-card.print-active, .payslip-card.print-active * { visibility: visible !important; } .payslip-card.print-active { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; } }`}</style>
    </main>
  );
}

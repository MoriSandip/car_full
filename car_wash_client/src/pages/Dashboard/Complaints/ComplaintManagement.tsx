import { FormEvent, useState } from "react";
import { LifeBuoy, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  complaintCategories,
  complaintPriorities,
  complaintStatuses,
  type ComplaintPriority,
  type ComplaintStatus,
  type ComplaintTicket,
  useGetAdminComplaintQuery,
  useGetAdminComplaintsQuery,
  useReplyToAdminComplaintMutation,
  useUpdateAdminComplaintMutation,
} from "@/redux/features/complaint/complaintApi";

const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const customerOf = (ticket: ComplaintTicket) =>
  typeof ticket.customerId === "string" ? undefined : ticket.customerId;

const bookingOf = (ticket: ComplaintTicket) =>
  !ticket.bookingId || typeof ticket.bookingId === "string"
    ? undefined
    : ticket.bookingId;

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return error instanceof Error ? error.message : "Support operation failed.";
};

const statusLabel = (status: ComplaintStatus) =>
  status === "InProgress" ? "In progress" : status;

const ComplaintManagement = () => {
  const [selectedId, setSelectedId] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState("");
  const [ticketStatus, setTicketStatus] = useState<ComplaintStatus>("Open");
  const [priority, setPriority] = useState<ComplaintPriority>("Normal");
  const ticketsQuery = useGetAdminComplaintsQuery({
    page,
    limit: 20,
    ...(statusFilter !== "all" ? { status: statusFilter as ComplaintStatus } : {}),
    ...(categoryFilter !== "all"
      ? { category: categoryFilter as (typeof complaintCategories)[number] }
      : {}),
    ...(search ? { search } : {}),
  });
  const ticketQuery = useGetAdminComplaintQuery(
    { id: selectedId },
    { skip: !selectedId },
  );
  const [replyToTicket, replyState] = useReplyToAdminComplaintMutation();
  const [updateTicket, updateState] = useUpdateAdminComplaintMutation();
  const tickets = ticketsQuery.data?.data.data ?? [];
  const ticket = ticketQuery.data?.data;

  const selectTicket = (item: ComplaintTicket) => {
    setSelectedId(item._id);
    setTicketStatus(item.status);
    setPriority(item.priority);
    setReply("");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    try {
      await replyToTicket({
        id: selectedId,
        message: reply.trim(),
        status: ticketStatus,
        priority,
      }).unwrap();
      setReply("");
      toast.success("Reply sent.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const saveTicketDetails = async () => {
    if (!selectedId) return;
    try {
      await updateTicket({
        id: selectedId,
        body: { status: ticketStatus, priority },
      }).unwrap();
      toast.success("Ticket status and priority updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaint & Support</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review customer requests, respond, and manage ticket status.
        </p>
      </div>

      <form
        onSubmit={submitSearch}
        className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_180px_190px_auto]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search tickets"
            className="pl-9"
            placeholder="Search ticket, subject, customer"
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            maxLength={100}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter tickets by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {complaintStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter tickets by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {complaintCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tickets ({ticketsQuery.data?.data.meta.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ticketsQuery.isLoading ? (
              <p className="py-5 text-sm text-slate-500">Loading tickets...</p>
            ) : ticketsQuery.isError ? (
              <p className="py-5 text-sm text-red-600">Could not load tickets. Please retry.</p>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <LifeBuoy className="h-8 w-8 text-slate-400" />
                <p className="font-medium">No matching tickets</p>
              </div>
            ) : (
              tickets.map((item) => {
                const customer = customerOf(item);
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => selectTicket(item)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedId === item._id
                        ? "border-sky-300 bg-sky-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">{item.subject}</span>
                      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {statusLabel(item.status)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.ticketNo} · {item.category}
                    </span>
                    <span className="mt-2 block text-sm text-slate-600">
                      {customer?.name || "Customer"}{customer?.email ? ` · ${customer.email}` : ""}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Updated {dateTime(item.lastMessageAt)}
                    </span>
                  </button>
                );
              })
            )}
            {ticketsQuery.data?.data.meta.totalPages &&
            ticketsQuery.data.data.meta.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500">
                  Page {page} of {ticketsQuery.data.data.meta.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= ticketsQuery.data.data.meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          {!selectedId ? (
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-slate-500">
              <LifeBuoy className="h-8 w-8" />
              <p>Select a ticket to review the conversation.</p>
            </CardContent>
          ) : ticketQuery.isLoading ? (
            <CardContent className="py-8 text-sm text-slate-500">
              Loading ticket...
            </CardContent>
          ) : ticketQuery.isError || !ticket ? (
            <CardContent className="py-8 text-sm text-red-600">
              Could not load this ticket. Select it again to retry.
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.ticketNo} · {ticket.category}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p>{customerOf(ticket)?.name || "Customer"}</p>
                    <p>{customerOf(ticket)?.email || ""}</p>
                    {bookingOf(ticket) ? (
                      <p className="mt-1 text-xs">
                        Booking: {bookingOf(ticket)?.serviceNameSnapshot || "Wash"}
                        {bookingOf(ticket)?.bookingDate
                          ? ` · ${bookingOf(ticket)?.bookingDate}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {ticket.messages.map((item) => (
                    <div
                      key={item._id}
                      className={`rounded-xl p-4 ${
                        item.senderRole === "ADMIN"
                          ? "ml-8 bg-sky-50"
                          : "mr-8 bg-slate-100"
                      }`}
                    >
                      <div className="mb-2 flex justify-between gap-4 text-xs text-slate-500">
                        <span>{item.senderRole === "ADMIN" ? "Support team" : customerOf(ticket)?.name || "Customer"}</span>
                        <time>{dateTime(item.createdAt)}</time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-800">{item.message}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="support-ticket-status">Status</Label>
                    <Select
                      value={ticketStatus}
                      onValueChange={(value) => setTicketStatus(value as ComplaintStatus)}
                    >
                      <SelectTrigger id="support-ticket-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {complaintStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-ticket-priority">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(value) => setPriority(value as ComplaintPriority)}
                    >
                      <SelectTrigger id="support-ticket-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {complaintPriorities.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="sm:col-span-2"
                    variant="outline"
                    onClick={saveTicketDetails}
                    disabled={updateState.isLoading}
                  >
                    {updateState.isLoading ? "Saving..." : "Save status & priority"}
                  </Button>
                </div>

                <form onSubmit={submitReply} className="space-y-3">
                  <Label htmlFor="admin-ticket-reply">Reply to customer</Label>
                  <Textarea
                    id="admin-ticket-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={4000}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={replyState.isLoading || !reply.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {replyState.isLoading ? "Sending..." : "Send reply"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ComplaintManagement;

import { FormEvent, useState } from "react";
import { ArrowLeft, LifeBuoy, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import {
  complaintCategories,
  type ComplaintCategory,
  type ComplaintTicket,
  useCreateCustomerComplaintMutation,
  useGetCustomerComplaintQuery,
  useGetCustomerComplaintsQuery,
  useReplyToCustomerComplaintMutation,
} from "@/redux/features/complaint/complaintApi";

const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const statusClass: Record<ComplaintTicket["status"], string> = {
  Open: "bg-sky-100 text-sky-800",
  InProgress: "bg-amber-100 text-amber-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-100 text-slate-700",
};

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return error instanceof Error ? error.message : "Support request failed.";
};

const CustomerSupport = () => {
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState<ComplaintCategory>("Booking");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [reply, setReply] = useState("");
  const ticketsQuery = useGetCustomerComplaintsQuery({ page: 1, limit: 100 });
  const ticketQuery = useGetCustomerComplaintQuery(
    { id: selectedId },
    { skip: !selectedId },
  );
  const [createTicket, createState] = useCreateCustomerComplaintMutation();
  const [replyToTicket, replyState] = useReplyToCustomerComplaintMutation();
  const tickets = ticketsQuery.data?.data.data ?? [];
  const ticket = ticketQuery.data?.data;

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await createTicket({
        category,
        subject: subject.trim(),
        message: initialMessage.trim(),
      }).unwrap();
      setSelectedId(result.data._id);
      setSubject("");
      setInitialMessage("");
      setCreateOpen(false);
      toast.success("Your support ticket was submitted.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    try {
      await replyToTicket({ id: selectedId, message: reply.trim() }).unwrap();
      setReply("");
      toast.success("Your reply was sent.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Complaints & Support</h1>
          <p className="mt-1 text-sm text-slate-600">
            Submit a request and follow the conversation with our support team.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New complaint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submitTicket} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Submit a support ticket</DialogTitle>
                <DialogDescription>
                  Include enough detail for our team to help you.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="complaint-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as ComplaintCategory)}
                >
                  <SelectTrigger id="complaint-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {complaintCategories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-subject">Subject</Label>
                <Input
                  id="complaint-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  minLength={4}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-message">Message</Label>
                <Textarea
                  id="complaint-message"
                  value={initialMessage}
                  onChange={(event) => setInitialMessage(event.target.value)}
                  minLength={2}
                  maxLength={4000}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createState.isLoading}>
                  {createState.isLoading ? "Submitting..." : "Submit ticket"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedId ? ticketQuery.isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-500">
            Loading conversation...
          </CardContent>
        </Card>
      ) : ticketQuery.isError || !ticket ? (
        <Card>
          <CardContent className="space-y-4 py-8">
            <p className="text-sm text-red-600">
              Could not load this ticket. Please try again.
            </p>
            <Button variant="outline" onClick={() => setSelectedId("")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All tickets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <Button
              variant="ghost"
              className="w-fit px-0"
              onClick={() => setSelectedId("")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              All tickets
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{ticket.subject}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {ticket.ticketNo} · {ticket.category}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[ticket.status]}`}>
                {ticket.status === "InProgress" ? "In progress" : ticket.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {ticket.messages.map((item) => (
                <div
                  key={item._id}
                  className={`max-w-3xl rounded-xl p-4 ${
                    item.senderRole === "CUSTOMER"
                      ? "ml-auto bg-sky-50"
                      : "bg-slate-100"
                  }`}
                >
                  <div className="mb-2 flex justify-between gap-4 text-xs text-slate-500">
                    <span>{item.senderRole === "CUSTOMER" ? "You" : "Support team"}</span>
                    <time>{dateTime(item.createdAt)}</time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{item.message}</p>
                </div>
              ))}
            </div>
            {ticket.status === "Closed" ? (
              <p className="text-sm text-slate-500">
                This ticket is closed. Contact support to open a new request.
              </p>
            ) : (
              <form onSubmit={submitReply} className="space-y-3 border-t pt-4">
                <Label htmlFor="customer-ticket-reply">Add a reply</Label>
                <Textarea
                  id="customer-ticket-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  maxLength={4000}
                  required
                />
                <Button type="submit" disabled={replyState.isLoading || !reply.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  {replyState.isLoading ? "Sending..." : "Send reply"}
                </Button>
                {ticket.status === "Resolved" ? (
                  <p className="text-xs text-slate-500">
                    Replying reopens this resolved ticket.
                  </p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticketsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading your tickets...</p>
            ) : ticketsQuery.isError ? (
              <p className="text-sm text-red-600">Could not load your tickets. Please refresh.</p>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <LifeBuoy className="h-8 w-8 text-slate-400" />
                <p className="font-medium">No support tickets yet</p>
                <p className="text-sm text-slate-500">Create a ticket if you need help with a wash or your account.</p>
              </div>
            ) : (
              tickets.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedId(item._id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-left transition hover:bg-slate-50"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">{item.subject}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.ticketNo} · {item.category} · Updated {dateTime(item.lastMessageAt)}
                    </span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[item.status]}`}>
                    {item.status === "InProgress" ? "In progress" : item.status}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSupport;

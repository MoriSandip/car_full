import { Types } from "mongoose";
import AppError from "../../app/errors/AppError";
import Booking from "../Booking/booking.model";
import { Customer } from "../Customer/customer.model";
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  Complaint,
} from "./complaint.model";

type TCreateComplaint = {
  category: string;
  subject: string;
  message: string;
  bookingId?: string;
};

type TComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
type TComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

type TReply = {
  message: string;
  status?: TComplaintStatus;
  priority?: TComplaintPriority;
};

const ticketNumberFor = (id: Types.ObjectId) =>
  `CS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id.toString().slice(-8).toUpperCase()}`;

const appendMessage = (
  ticket: InstanceType<typeof Complaint>,
  senderRole: "CUSTOMER" | "ADMIN",
  senderId: string,
  content: string,
) => {
  ticket.messages.push({
    senderRole,
    senderId: new Types.ObjectId(senderId),
    message: content.trim(),
    createdAt: new Date(),
  });
  ticket.lastMessageAt = new Date();
};

const setTicketState = (
  ticket: InstanceType<typeof Complaint>,
  status?: TComplaintStatus,
  priority?: TComplaintPriority,
) => {
  if (status) {
    ticket.status = status;
    ticket.resolvedAt = status === "Resolved" ? new Date() : null;
    ticket.closedAt = status === "Closed" ? new Date() : null;
  }
  if (priority) ticket.priority = priority;
};

const createCustomerComplaint = async (
  customerId: string,
  payload: TCreateComplaint,
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new AppError(401, "Customer authentication is required.");
  }
  if (payload.bookingId) {
    const booking = await Booking.findOne({
      _id: payload.bookingId,
      customerId,
      isDeleted: { $ne: true },
    }).select("_id");
    if (!booking) {
      throw new AppError(404, "Booking not found for this customer.");
    }
  }
  const id = new Types.ObjectId();
  return Complaint.create({
    _id: id,
    ticketNo: ticketNumberFor(id),
    customerId,
    bookingId: payload.bookingId ?? null,
    category: payload.category,
    subject: payload.subject.trim(),
    status: "Open",
    priority: "Normal",
    messages: [
      {
        senderRole: "CUSTOMER",
        senderId: customerId,
        message: payload.message.trim(),
        createdAt: new Date(),
      },
    ],
    lastMessageAt: new Date(),
  });
};

const getCustomerComplaints = async (
  customerId: string,
  filters: { page: number; limit: number; status?: string },
) => {
  const page = Math.max(1, Math.floor(filters.page));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit)));
  const query = {
    customerId,
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [data, total] = await Promise.all([
    Complaint.find(query)
      .select("ticketNo category subject status priority bookingId lastMessageAt resolvedAt closedAt createdAt updatedAt")
      .populate("bookingId", "bookingDate bookingTime serviceNameSnapshot")
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(query),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getCustomerComplaint = async (customerId: string, id: string) => {
  const ticket = await Complaint.findOne({ _id: id, customerId })
    .populate("bookingId", "bookingDate bookingTime serviceNameSnapshot")
    .lean();
  if (!ticket) throw new AppError(404, "Support ticket not found.");
  return ticket;
};

const replyAsCustomer = async (
  customerId: string,
  id: string,
  content: string,
) => {
  const ticket = await Complaint.findOne({ _id: id, customerId });
  if (!ticket) throw new AppError(404, "Support ticket not found.");
  if (ticket.status === "Closed") {
    throw new AppError(409, "This ticket is closed and cannot receive replies.");
  }
  appendMessage(ticket, "CUSTOMER", customerId, content);
  if (ticket.status === "Resolved") {
    setTicketState(ticket, "Open");
  }
  await ticket.save();
  return ticket;
};

const getAdminComplaints = async (filters: {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  search?: string;
}) => {
  const page = Math.max(1, Math.floor(filters.page));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit)));
  const query: Record<string, unknown> = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };
  const search = filters.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ],
    }).select("_id");
    query.$or = [
      { ticketNo: { $regex: escaped, $options: "i" } },
      { subject: { $regex: escaped, $options: "i" } },
      { customerId: { $in: matchingCustomers.map(({ _id }) => _id) } },
    ];
  }
  const [data, total] = await Promise.all([
    Complaint.find(query)
      .populate("customerId", "name email phone")
      .populate("bookingId", "bookingDate bookingTime serviceNameSnapshot")
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(query),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getAdminComplaint = async (id: string) => {
  const ticket = await Complaint.findById(id)
    .populate("customerId", "name email phone")
    .populate("bookingId", "bookingDate bookingTime serviceNameSnapshot")
    .lean();
  if (!ticket) throw new AppError(404, "Support ticket not found.");
  return ticket;
};

const replyAsAdmin = async (adminId: string, id: string, payload: TReply) => {
  if (!Types.ObjectId.isValid(adminId)) {
    throw new AppError(401, "Administrator authentication is required.");
  }
  const ticket = await Complaint.findById(id);
  if (!ticket) throw new AppError(404, "Support ticket not found.");
  appendMessage(ticket, "ADMIN", adminId, payload.message);
  setTicketState(ticket, payload.status ?? "InProgress", payload.priority);
  await ticket.save();
  return ticket;
};

const updateAdminComplaint = async (
  id: string,
  payload: { status?: TComplaintStatus; priority?: TComplaintPriority },
) => {
  const ticket = await Complaint.findById(id);
  if (!ticket) throw new AppError(404, "Support ticket not found.");
  setTicketState(ticket, payload.status, payload.priority);
  await ticket.save();
  return ticket;
};

export const ComplaintService = {
  createCustomerComplaint,
  getCustomerComplaints,
  getCustomerComplaint,
  replyAsCustomer,
  getAdminComplaints,
  getAdminComplaint,
  replyAsAdmin,
  updateAdminComplaint,
};

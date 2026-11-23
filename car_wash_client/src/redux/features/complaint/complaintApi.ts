import { baseApi } from "@/redux/api/baseApi";

export const complaintCategories = [
  "Booking",
  "Payment",
  "Service quality",
  "Membership",
  "Other",
] as const;

export const complaintStatuses = [
  "Open",
  "InProgress",
  "Resolved",
  "Closed",
] as const;

export const complaintPriorities = ["Low", "Normal", "High"] as const;

export type ComplaintCategory = (typeof complaintCategories)[number];
export type ComplaintStatus = (typeof complaintStatuses)[number];
export type ComplaintPriority = (typeof complaintPriorities)[number];

export type ComplaintMessage = {
  _id: string;
  senderRole: "CUSTOMER" | "ADMIN";
  senderId: string | { name?: string };
  message: string;
  createdAt: string;
};

export type ComplaintTicket = {
  _id: string;
  ticketNo: string;
  customerId:
    | string
    | { _id: string; name?: string; email?: string; phone?: string };
  bookingId:
    | string
    | {
        _id: string;
        bookingDate?: string;
        bookingTime?: string;
        serviceNameSnapshot?: string;
      }
    | null;
  category: ComplaintCategory;
  subject: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  messages: ComplaintMessage[];
  lastMessageAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateComplaintPayload = {
  category: ComplaintCategory;
  subject: string;
  message: string;
  bookingId?: string;
};

export const complaintApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerComplaints: builder.query<
      ApiResponse<Paginated<ComplaintTicket>>,
      { page?: number; limit?: number; status?: ComplaintStatus } | void
    >({
      query: (params) => ({ url: "/complaints/mine", params: params || {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.data.map(({ _id }) => ({
                type: "Complaints" as const,
                id: _id,
              })),
              { type: "Complaints" as const, id: "CUSTOMER_LIST" },
            ]
          : [{ type: "Complaints" as const, id: "CUSTOMER_LIST" }],
    }),
    getCustomerComplaint: builder.query<
      ApiResponse<ComplaintTicket>,
      { id: string }
    >({
      query: ({ id }) => ({ url: `/complaints/mine/${id}` }),
      providesTags: (_result, _error, { id }) => [
        { type: "Complaints", id },
      ],
    }),
    createCustomerComplaint: builder.mutation<
      ApiResponse<ComplaintTicket>,
      CreateComplaintPayload
    >({
      query: (body) => ({ url: "/complaints", method: "POST", body }),
      invalidatesTags: [{ type: "Complaints", id: "CUSTOMER_LIST" }],
    }),
    replyToCustomerComplaint: builder.mutation<
      ApiResponse<ComplaintTicket>,
      { id: string; message: string }
    >({
      query: ({ id, message }) => ({
        url: `/complaints/mine/${id}/replies`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Complaints", id },
        { type: "Complaints", id: "CUSTOMER_LIST" },
      ],
    }),
    getAdminComplaints: builder.query<
      ApiResponse<Paginated<ComplaintTicket>>,
      {
        page?: number;
        limit?: number;
        status?: ComplaintStatus;
        category?: ComplaintCategory;
        search?: string;
      } | void
    >({
      query: (params) => ({ url: "/complaints", params: params || {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.data.map(({ _id }) => ({
                type: "Complaints" as const,
                id: _id,
              })),
              { type: "Complaints" as const, id: "ADMIN_LIST" },
            ]
          : [{ type: "Complaints" as const, id: "ADMIN_LIST" }],
    }),
    getAdminComplaint: builder.query<
      ApiResponse<ComplaintTicket>,
      { id: string }
    >({
      query: ({ id }) => ({ url: `/complaints/${id}` }),
      providesTags: (_result, _error, { id }) => [
        { type: "Complaints", id },
      ],
    }),
    replyToAdminComplaint: builder.mutation<
      ApiResponse<ComplaintTicket>,
      {
        id: string;
        message: string;
        status?: ComplaintStatus;
        priority?: ComplaintPriority;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/complaints/${id}/replies`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Complaints", id },
        { type: "Complaints", id: "ADMIN_LIST" },
      ],
    }),
    updateAdminComplaint: builder.mutation<
      ApiResponse<ComplaintTicket>,
      {
        id: string;
        body: { status?: ComplaintStatus; priority?: ComplaintPriority };
      }
    >({
      query: ({ id, body }) => ({
        url: `/complaints/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Complaints", id },
        { type: "Complaints", id: "ADMIN_LIST" },
      ],
    }),
  }),
});

export const {
  useGetCustomerComplaintsQuery,
  useGetCustomerComplaintQuery,
  useCreateCustomerComplaintMutation,
  useReplyToCustomerComplaintMutation,
  useGetAdminComplaintsQuery,
  useGetAdminComplaintQuery,
  useReplyToAdminComplaintMutation,
  useUpdateAdminComplaintMutation,
} = complaintApi;

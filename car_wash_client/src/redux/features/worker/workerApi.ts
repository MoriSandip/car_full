
import { baseApi } from "@/redux/api/baseApi";

export type TWorkerStatus = "ACTIVE" | "INACTIVE";

export interface TWorker {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: TWorkerStatus;
  address?: string;
  imageUrl?: string;
  monthlySalary: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TWorkerPayload = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  status: TWorkerStatus;
  address?: string;
  imageUrl?: string;
  monthlySalary?: number;
};

export type WorkerCashTransaction = {
  _id: string;
  bookingId?: {
    _id: string;
    bookingDate: string;
    bookingTime: string;
    serviceNameSnapshot: string;
    status: string;
    paymentType?: string;
    paymentMethod?: string;
    carId?: {
      registrationNumber?: string;
      make?: string;
      model?: string;
    };
  };
  customerId?: { name?: string; email?: string; phone?: string };
  amount: number;
  currency: string;
  provider: "Cash";
  status: "Pending" | "Paid" | "Failed" | "Refunded";
  reference?: string;
  recordedBy?: { name?: string };
  recordedByWorker?: { name?: string };
  refundReference?: string;
  refundReason?: string;
  createdAt: string;
  verifiedAt?: string;
  refundedAt?: string;
};

export type WorkerCashTransactions = {
  data: WorkerCashTransaction[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    summary?: {
      transactionCount: number;
      paidCount: number;
      paidAmount: number;
      refundedAmount: number;
    };
  };
};

export interface TWorkerListParams {
  search?: string;
  status?: TWorkerStatus | "";
  page?: number;
  limit?: number;
}

export interface TWorkerListResponse {
  data: TWorker[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface TWorkerStats {
  total: number;
  active: number;
  inactive: number;
}

export interface TWorkerLoginResponse {
  accessToken: string;
  worker: TWorker;
}

export type WorkerAttendance = {
  _id: string;
  dateKey: string;
  punchInAt: string;
  punchInSelfie: string;
  punchOutAt?: string | null;
  punchOutSelfie?: string | null;
};

export type DailyAttendanceReport = {
  date: string;
  summary: { totalWorkers: number; present: number; absent: number };
  records: {
    worker: Pick<TWorker, "_id" | "name" | "email" | "phone">;
    attendance: WorkerAttendance | null;
    status: "PRESENT" | "ABSENT";
  }[];
};

export type WorkerAttendanceHistory = {
  records: WorkerAttendance[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WorkerLeaveRequest = {
    _id: string;
    workerId: string | { _id: string; name: string };
    startDate: string;
    endDate: string;
    leaveType: "Paid" | "Unpaid";
    halfDay: boolean;
    reason: string;
    status: "Pending" | "Approved" | "Rejected" | "Cancelled";
    reviewNote?: string;
    affectedBookings?: {
      _id: string;
      bookingDate: string;
      bookingTime: string;
      serviceNameSnapshot: string;
      societyId?: string | { name?: string };
      carId?: string | { registrationNumber?: string };
    }[];
};

export type WorkerPayroll = {
    _id: string;
    workerId: string | { _id: string; name: string };
    periodStart: string;
    periodEnd: string;
    monthlySalary: number;
    basePay: number;
    absentDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    overtimeHours: number;
    overtimePay: number;
    deductions: number;
    grossPay: number;
    netPay: number;
    currency: string;
    status: "Draft" | "Approved" | "Paid";
    paidAt?: string;
    paymentReference?: string;
};

const unwrap = (response: any) => response?.data ?? response;

const unwrapNullable = <T,>(response: unknown): T | null => {
  if (
    typeof response !== "object" ||
    response === null ||
    !("data" in response)
  ) {
    throw new Error("Invalid attendance response.");
  }
  const data = response.data;
  if (data === null) return null;
  if (typeof data !== "object" || data === null || !("_id" in data)) {
    throw new Error("Invalid attendance response.");
  }
  return data as T;
};

const getArray = (response: any): any[] => {
  const candidates = [
    response?.data,
    response?.data?.data,
    response?.data?.result,
    response?.data?.results,
    response?.data?.docs,
    response?.data?.items,
    response?.result,
    response?.results,
    response?.docs,
    response?.items,
    response,
  ];

  return candidates.find(Array.isArray) ?? [];
};

export const workerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkers: builder.query<
      TWorkerListResponse,
      TWorkerListParams | void
    >({
      query: (params) => ({
        url: "/workers",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: any): TWorkerListResponse => ({
        data: getArray(response),
        meta:
          response?.meta ??
          response?.data?.meta ??
          response?.data?.data?.meta,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({
                type: "Worker" as const,
                id: _id,
              })),
              { type: "Worker" as const, id: "LIST" },
              { type: "Worker" as const, id: "STATS" },
            ]
          : [
              { type: "Worker" as const, id: "LIST" },
              { type: "Worker" as const, id: "STATS" },
            ],
    }),

    getSingleWorker: builder.query<TWorker, string>({
      query: (id) => ({ url: `/workers/${id}` }),
      transformResponse: unwrap,
      providesTags: (_result, _error, id) => [
        { type: "Worker", id },
      ],
    }),

    getWorkerStats: builder.query<TWorkerStats, void>({
      query: () => ({ url: "/workers/stats" }),
      transformResponse: unwrap,
      providesTags: [{ type: "Worker", id: "STATS" }],
    }),

    createWorker: builder.mutation<TWorker, TWorkerPayload>({
      query: (body) => ({
        url: "/workers",
        method: "POST",
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: [
        { type: "Worker", id: "LIST" },
        { type: "Worker", id: "STATS" },
      ],
    }),

    updateWorker: builder.mutation<
      TWorker,
      { id: string; data: Partial<TWorkerPayload> }
    >({
      query: ({ id, data }) => ({
        url: `/workers/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Worker", id },
        { type: "Worker", id: "LIST" },
        { type: "Worker", id: "STATS" },
      ],
    }),

    deleteWorker: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/workers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Worker", id: "LIST" },
        { type: "Worker", id: "STATS" },
      ],
    }),
getMyProfile: builder.query<any, void>({
  query: () => ({
    url: "/workers/me",
    method: "GET",
  }),
  providesTags: ["Worker"],
}),
    getWorkerDashboard: builder.query({
      query: () => ({
        url: "/workers/dashboard",
        method: "GET",
      }),
      providesTags: ["Worker"],
    }),
     getWorkerAssignedBookings: builder.query<
      any,
      {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        from?: string;
        toExclusive?: string;
      }
    >({
      query: ({
        page = 1,
        limit = 100,
        status,
        search,
        from,
        toExclusive,
      } = {}) => ({
        url: '/workers/assigned-bookings',
        method: 'GET',
        params: {
          page,
          limit,
          ...(from ? {from} : {}),
          ...(toExclusive ? {toExclusive} : {}),
          ...(status && status !== 'All' ? { status } : {}),
          ...(search ? { search } : {}),
        },
      }),
      providesTags: ['Worker'],
    }),

updateWorkerBookingWorkAction: builder.mutation<
  any,
  {
    id: string;
    action: "start" | "stop" | "resume" | "done";
    cashReceived?: boolean;
  }
>({
  query: ({ id, action, cashReceived }) => ({
    url: `/workers/assigned-bookings/${id}/work-action`,
    method: "PATCH",
    body: { action, ...(cashReceived === undefined ? {} : { cashReceived }) },
  }),
  invalidatesTags: ["Worker", "PaymentTransactions"],
}),
updateWorkerBookingProgress: builder.mutation<
  unknown,
  {
    id: string;
    body: {
      beforePhoto?: string;
      afterPhoto?: string;
      cleaningChecklist?: {
        exteriorWash: boolean;
        interiorCleaning: boolean;
        dashboard: boolean;
        tyreDressing: boolean;
        vacuumCleaning: boolean;
      };
      workerNotes?: string;
    };
  }
>({
  query: ({id, body}) => ({
    url: `/workers/assigned-bookings/${id}/progress`,
    method: "PATCH",
    body,
  }),
  invalidatesTags: ["Worker"],
}),

    workerLogin: builder.mutation<
      TWorkerLoginResponse,
      { email: string; password: string }
    >({
      query: (body) => ({
        url: "/workers/login",
        method: "POST",
        body,
      }),
      transformResponse: unwrap,
    }),
    getMyAttendance: builder.query<WorkerAttendance | null, void>({
      query: () => ({ url: "/workers/attendance/me" }),
      transformResponse: (response) => unwrapNullable<WorkerAttendance>(response),
      providesTags: ["Attendance"],
    }),
    getMyCashTransactions: builder.query<
      WorkerCashTransactions,
      {
        page?: number;
        limit?: number;
        status?: "Pending" | "Paid" | "Failed" | "Refunded";
        from?: string;
        to?: string;
      } | void
    >({
      query: (params) => ({
        url: "/workers/cash-transactions",
        params: params ?? {},
      }),
      providesTags: ["PaymentTransactions"],
    }),
    getMyAttendanceHistory: builder.query<
      WorkerAttendanceHistory,
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/workers/attendance/my-history",
        params: params ?? { page: 1, limit: 10 },
      }),
      transformResponse: unwrap,
      providesTags: ["Attendance"],
    }),
    punchAttendance: builder.mutation<
      WorkerAttendance,
      { action: "in" | "out"; selfie: string }
    >({
      query: ({ action, selfie }) => ({
        url: `/workers/attendance/punch-${action}`,
        method: "POST",
        body: { selfie },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["Attendance"],
    }),
    getDailyAttendanceReport: builder.query<
      DailyAttendanceReport,
      { date: string; workerId?: string }
    >({
      query: (params) => ({ url: "/workers/attendance", params }),
      transformResponse: unwrap,
      providesTags: ["Attendance"],
    }),
    getMyLeaves: builder.query<WorkerLeaveRequest[], void>({
      query: () => ({ url: "/workers/leaves/mine" }),
      transformResponse: unwrap,
      providesTags: ["Leave"],
    }),
    requestLeave: builder.mutation<
      WorkerLeaveRequest,
      { startDate: string; endDate: string; leaveType: "Paid" | "Unpaid"; halfDay: boolean; reason: string }
    >({
      query: (body) => ({ url: "/workers/leaves", method: "POST", body }),
      transformResponse: unwrap,
      invalidatesTags: ["Leave"],
    }),
    cancelLeave: builder.mutation<WorkerLeaveRequest, string>({
      query: (id) => ({ url: `/workers/leaves/${id}`, method: "DELETE" }),
      transformResponse: unwrap,
      invalidatesTags: ["Leave"],
    }),
    getAdminLeaves: builder.query<WorkerLeaveRequest[], void>({
      query: () => ({ url: "/workers/leaves" }),
      transformResponse: unwrap,
      providesTags: ["Leave"],
    }),
    reviewLeave: builder.mutation<
      WorkerLeaveRequest,
      { id: string; decision: "Approved" | "Rejected"; leaveType: "Paid" | "Unpaid"; reviewNote?: string; reassignments: { bookingId: string; workerId: string }[] }
    >({
      query: ({ id, ...body }) => ({ url: `/workers/leaves/${id}/review`, method: "PATCH", body }),
      transformResponse: unwrap,
      invalidatesTags: ["Leave", "Worker"],
    }),
    getMyPayroll: builder.query<WorkerPayroll[], void>({
      query: () => ({ url: "/workers/payroll/mine" }),
      transformResponse: unwrap,
      providesTags: ["Payroll"],
    }),
    getPayroll: builder.query<WorkerPayroll[], void>({
      query: () => ({ url: "/workers/payroll" }),
      transformResponse: unwrap,
      providesTags: ["Payroll"],
    }),
    generatePayroll: builder.mutation<
      WorkerPayroll[],
      { periodStart: string; periodEnd: string }
    >({
      query: (body) => ({ url: "/workers/payroll/generate", method: "POST", body }),
      transformResponse: unwrap,
      invalidatesTags: ["Payroll"],
    }),
    updatePayroll: builder.mutation<
      WorkerPayroll,
      { id: string; action: "approve" | "pay"; paymentReference?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/workers/payroll/${id}`, method: "PATCH", body }),
      transformResponse: unwrap,
      invalidatesTags: ["Payroll"],
    }),
  }),
});

export const {
  useGetWorkersQuery,
  useGetSingleWorkerQuery,
  useGetWorkerStatsQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useDeleteWorkerMutation,
  useWorkerLoginMutation,
  useGetWorkerDashboardQuery,
  useGetWorkerAssignedBookingsQuery,
  useGetMyProfileQuery,
  useUpdateWorkerBookingWorkActionMutation,
  useUpdateWorkerBookingProgressMutation,
  useGetMyAttendanceQuery,
  useGetMyAttendanceHistoryQuery,
  useGetMyCashTransactionsQuery,
  usePunchAttendanceMutation,
  useGetDailyAttendanceReportQuery,
  useGetMyLeavesQuery,
  useRequestLeaveMutation,
  useCancelLeaveMutation,
  useGetAdminLeavesQuery,
  useReviewLeaveMutation,
  useGetMyPayrollQuery,
  useGetPayrollQuery,
  useGeneratePayrollMutation,
  useUpdatePayrollMutation,
} = workerApi;

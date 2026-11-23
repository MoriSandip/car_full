import { baseApi } from "@/redux/api/baseApi";

export type ReportFilters = {
  from: string;
  to: string;
  societyId?: string;
};

export type ReportSummary = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  paidBookingValue: number;
  collectedRevenue: number;
  refundedAmount: number;
  successfulPayments: number;
};

export type ReportAnalytics = {
  range: Omit<ReportFilters, "societyId"> & { societyId: string | null };
  summary: ReportSummary;
  dailyBookings: { date: string; bookings: number; completed: number }[];
  dailyRevenue: { date: string; amount: number; transactions: number }[];
  servicePerformance: {
    service: string;
    bookings: number;
    completed: number;
    paidAmount: number;
  }[];
  societyPerformance: {
    societyId: string;
    society: string;
    bookings: number;
    completed: number;
    paidAmount: number;
  }[];
  workerPerformance: {
    workerId: string;
    worker: string;
    bookings: number;
    completed: number;
    averageRating: number;
    workingSeconds: number;
  }[];
  paymentMethods: {
    provider: string;
    transactions: number;
    amount: number;
  }[];
  revenueByType: {
    type: string;
    transactions: number;
    amount: number;
  }[];
};

export type ReportBooking = {
  _id: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentType: string;
  amountPayable: number;
  serviceNameSnapshot: string;
  societyId?: string | { _id: string; name?: string };
  workerId?: string | { _id: string; name?: string };
  carId?: string | { _id: string; registrationNumber?: string };
};

export type ReportBookingsPage = {
  data: ReportBooking[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportAnalytics: builder.query<
      ApiResponse<ReportAnalytics>,
      ReportFilters
    >({
      query: (params) => ({ url: "/reports/analytics", params }),
      providesTags: ["Reports"],
    }),
    getReportBookings: builder.query<
      ApiResponse<ReportBookingsPage>,
      ReportFilters & { page: number; limit: number }
    >({
      query: (params) => ({ url: "/reports/bookings", params }),
      providesTags: ["Reports"],
    }),
  }),
});

export const {
  useGetReportAnalyticsQuery,
  useGetReportBookingsQuery,
  useLazyGetReportBookingsQuery,
} = reportApi;
import {api} from './api';
import type {Booking, WorkerAttendance, WorkerDashboard} from './types';

type ApiResponse<T> = {success: boolean; data: T};
type ListEnvelope<T> = {
  success: boolean;
  data: T[];
  meta?: {page: number; limit: number; total: number; totalPage: number};
};
type RawListResponse<T> = {
  success: boolean;
  data?:
    | T[]
    | {
        data?: T[];
        result?: T[];
        results?: T[];
        docs?: T[];
        items?: T[];
        meta?: ListEnvelope<T>['meta'];
      };
  meta?: ListEnvelope<T>['meta'];
};

type AttendanceHistory = {
  records: WorkerAttendance[];
  meta: {page: number; limit: number; total: number; totalPages: number};
};

const normalizeList = <T,>(response: RawListResponse<T>): ListEnvelope<T> => {
  if (Array.isArray(response.data)) {
    return {success: response.success, data: response.data, meta: response.meta};
  }
  const nested = response.data;
  return {
    success: response.success,
    data:
      nested?.data ??
      nested?.result ??
      nested?.results ??
      nested?.docs ??
      nested?.items ??
      [],
    meta: response.meta ?? nested?.meta,
  };
};

export const workerApi = api.injectEndpoints({
  endpoints: builder => ({
    getWorkerDashboard: builder.query<ApiResponse<WorkerDashboard>, void>({
      query: () => '/workers/dashboard',
      providesTags: ['Bookings', 'Profile'],
    }),
    getMyAttendance: builder.query<ApiResponse<WorkerAttendance | null>, void>({
      query: () => '/workers/attendance/me',
      providesTags: ['Attendance'],
    }),
    getMyAttendanceHistory: builder.query<
      ApiResponse<AttendanceHistory>,
      {page: number; limit: number}
    >({
      query: params => ({
        url: '/workers/attendance/my-history',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    punchAttendance: builder.mutation<
      ApiResponse<WorkerAttendance>,
      {action: 'in' | 'out'; selfie: string}
    >({
      query: ({action, selfie}) => ({
        url: `/workers/attendance/punch-${action}`,
        method: 'POST',
        body: {selfie},
      }),
      invalidatesTags: ['Attendance'],
    }),
    getAssignedBookings: builder.query<
      ListEnvelope<Booking>,
      {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        from?: string;
        toExclusive?: string;
      } | void
    >({
      async queryFn(params, _queryApi, _extraOptions, baseQuery) {
        const {
          status,
          search,
          from,
          toExclusive,
        } = params ?? {};
        const pageSize = 100;
        const bookings: Booking[] = [];
        let page = Math.max(1, params?.page ?? 1);
        let meta: ListEnvelope<Booking>['meta'];

        while (true) {
          const response = await baseQuery({
            url: '/workers/assigned-bookings',
            params: {
              page,
              limit: pageSize,
              ...(from ? {from} : {}),
              ...(toExclusive ? {toExclusive} : {}),
              ...(status && status !== 'All' ? {status} : {}),
              ...(search?.trim() ? {search: search.trim()} : {}),
            },
          });

          if (response.error) return {error: response.error};

          const normalized = normalizeList(
            response.data as RawListResponse<Booking>,
          );
          bookings.push(...normalized.data);
          meta = normalized.meta ?? meta;

          const totalPages = Number(meta?.totalPage);
          if (
            normalized.data.length < pageSize ||
            (Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages)
          ) {
            break;
          }
          page += 1;
        }

        return {
          data: {success: true, data: bookings, meta},
        };
      },
      providesTags: ['Bookings'],
    }),
    performWorkAction: builder.mutation<
      ApiResponse<Booking>,
      {
        bookingId: string;
        action: 'start' | 'stop' | 'resume' | 'done';
        cashReceived?: boolean;
      }
    >({
      query: ({bookingId, action, cashReceived}) => ({
        url: `/workers/assigned-bookings/${bookingId}/work-action`,
        method: 'PATCH',
        body: {action, ...(cashReceived === undefined ? {} : {cashReceived})},
      }),
      invalidatesTags: ['Bookings'],
    }),
    updateCleaningProgress: builder.mutation<
      ApiResponse<Booking>,
      {
        bookingId: string;
        progress: {
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
      query: ({bookingId, progress}) => ({
        url: `/workers/assigned-bookings/${bookingId}/progress`,
        method: 'PATCH',
        body: progress,
      }),
      invalidatesTags: ['Bookings'],
    }),
    getWorkerProfile: builder.query<ApiResponse<Record<string, string>>, void>({
      query: () => '/workers/me',
      providesTags: ['Profile'],
    }),
  }),
});

export const {
  useGetWorkerDashboardQuery,
  useGetAssignedBookingsQuery,
  usePerformWorkActionMutation,
  useUpdateCleaningProgressMutation,
  useGetWorkerProfileQuery,
  useGetMyAttendanceQuery,
  useGetMyAttendanceHistoryQuery,
  usePunchAttendanceMutation,
} = workerApi;

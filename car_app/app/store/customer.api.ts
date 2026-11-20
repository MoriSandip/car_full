import {api} from './api';
import type {AppUser} from './auth.slice';
import type {
  Booking,
  Car,
  Flat,
  Society,
  WashService,
  Slot,
  Membership,
  MembershipOffer,
  MembershipPlan,
} from './types';

type ListEnvelope<T> = {
  success: boolean;
  data: T[];
  meta?: {page: number; limit: number; total: number; totalPage: number};
};
type ApiEnvelope<T> = {
  success: boolean;
  data: T;
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

export type CustomerPaymentTransaction = {
  _id: string;
  bookingId?: {
    _id: string;
    bookingDate: string;
    bookingTime: string;
    serviceNameSnapshot: string;
    status: string;
    paymentType?: string;
  };
  membershipId?: {
    _id: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  amount: number;
  provider: 'Stripe' | 'Cash' | 'UPI';
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  reference?: string;
  recordedByWorker?: {name?: string};
  createdAt: string;
};

export type CustomerPaymentHistory = {
  success: boolean;
  data: CustomerPaymentTransaction[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    summary?: {
      paidAmount: number;
      pendingAmount: number;
      cashPaidAmount: number;
      onlinePaidAmount: number;
    };
  };
};

const normalizeList = <T,>(response: RawListResponse<T>): ListEnvelope<T> => {
  if (Array.isArray(response.data)) {
    return {success: response.success, data: response.data, meta: response.meta};
  }
  const nested = response.data;
  const rows =
    nested?.data ??
    nested?.result ??
    nested?.results ??
    nested?.docs ??
    nested?.items ??
    [];
  return {
    success: response.success,
    data: rows,
    meta: response.meta ?? nested?.meta,
  };
};

export type CustomerBookingPayload = {
  societyId: string;
  flatId: string;
  carId: string;
  serviceId: string;
  slotId: string;
  bookingDate: string;
  bookingTime: string;
  paymentType: 'Individual' | 'Membership';
  paymentMethod?: 'Stripe' | 'Cash';
  membershipId?: string;
};

export type SocietyPayload = {
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
};

export type FlatPayload = {
  societyId: string;
  flatNumber: string;
  block?: string;
  floorNumber?: number;
  flatType: string;
  area?: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  description?: string;
};

export type CarPayload = {
  societyId: string;
  flatId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  registrationNumber: string;
  make: string;
  model: string;
  color: string;
  imageUrl?: string;
  carType: Car['carType'];
  parkingSlot?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  description?: string;
};

export const customerApi = api.injectEndpoints({
  endpoints: builder => ({
    getCustomerProfile: builder.query<ApiEnvelope<AppUser>, void>({
      query: () => '/customers/me',
      providesTags: ['Profile'],
    }),
    getMyCars: builder.query<ListEnvelope<Car>, void>({
      query: () => '/cars/my',
      transformResponse: (response: RawListResponse<Car>) =>
        normalizeList(response),
      providesTags: ['Cars'],
    }),
    uploadImage: builder.mutation<
      ApiEnvelope<{url: string}>,
      {image: string; mimeType: string}
    >({
      query: body => ({url: '/uploads/images', method: 'POST', body}),
    }),
    createCustomerCar: builder.mutation<ApiEnvelope<Car>, CarPayload>({
      query: body => ({url: '/cars', method: 'POST', body}),
      invalidatesTags: ['Cars'],
    }),
    updateCustomerCar: builder.mutation<
      ApiEnvelope<Car>,
      {id: string; body: Partial<CarPayload>}
    >({
      query: ({id, body}) => ({url: `/cars/${id}`, method: 'PUT', body}),
      invalidatesTags: ['Cars'],
    }),
    deleteCustomerCar: builder.mutation<
      ApiEnvelope<unknown>,
      string
    >({
      query: id => ({url: `/cars/${id}`, method: 'DELETE'}),
      invalidatesTags: ['Cars'],
    }),
    getMySocieties: builder.query<ListEnvelope<Society>, void>({
      query: () => '/societies/my',
      transformResponse: (response: RawListResponse<Society>) =>
        normalizeList(response),
      providesTags: ['Societies'],
    }),
    createCustomerSociety: builder.mutation<
      ApiEnvelope<Society>,
      SocietyPayload
    >({
      query: body => ({url: '/societies', method: 'POST', body}),
      invalidatesTags: ['Societies'],
    }),
    getMyFlats: builder.query<ListEnvelope<Flat>, void>({
      query: () => '/flats/my',
      transformResponse: (response: RawListResponse<Flat>) =>
        normalizeList(response),
      providesTags: ['Flats'],
    }),
    createCustomerFlat: builder.mutation<ApiEnvelope<Flat>, FlatPayload>({
      query: body => ({url: '/flats', method: 'POST', body}),
      invalidatesTags: ['Flats'],
    }),
    updateCustomerFlat: builder.mutation<
      ApiEnvelope<Flat>,
      {id: string; body: Partial<FlatPayload>}
    >({
      query: ({id, body}) => ({url: `/flats/${id}`, method: 'PUT', body}),
      invalidatesTags: ['Flats'],
    }),
    deleteCustomerFlat: builder.mutation<ApiEnvelope<unknown>, string>({
      query: id => ({url: `/flats/${id}`, method: 'DELETE'}),
      invalidatesTags: ['Flats'],
    }),
    getWashServices: builder.query<ListEnvelope<WashService>, void>({
      query: () => ({url: '/wash-services', params: {status: 'Active', page: 1, limit: 100}}),
      transformResponse: (response: RawListResponse<WashService>) =>
        normalizeList(response),
      providesTags: ['Services'],
    }),
    getAvailableSlots: builder.query<
      ListEnvelope<Slot>,
      {serviceId: string; from: string; to: string}
    >({
      query: params => ({url: '/slots/availability', params}),
      transformResponse: (response: RawListResponse<Slot>) =>
        normalizeList(response),
      providesTags: ['Slots'],
    }),
    getMyBookings: builder.query<ListEnvelope<Booking>, void>({
      query: () => ({url: '/bookings/mine', params: {page: 1, limit: 100}}),
      transformResponse: (response: RawListResponse<Booking>) =>
        normalizeList(response),
      providesTags: ['Bookings'],
    }),
    getMyPaymentTransactions: builder.query<
      CustomerPaymentHistory,
      {
        page?: number;
        limit?: number;
        status?: string;
        provider?: string;
      } | void
    >({
      query: params => ({
        url: '/payment/my-transactions',
        params: params || {},
      }),
    }),
    createCashReceiptLink: builder.mutation<
      ApiEnvelope<{url: string; expiresInSeconds: number}>,
      string
    >({
      query: bookingId => ({
        url: `/payment/bookings/${bookingId}/receipt-link`,
        method: 'POST',
      }),
    }),
    updateCustomerBooking: builder.mutation<
      ApiEnvelope<Booking>,
      {
        id: string;
        body: {bookingDate: string; bookingTime: string; slotId: string};
      }
    >({
      query: ({id, body}) => ({
        url: `/bookings/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Bookings', 'Slots'],
    }),
    submitBookingReview: builder.mutation<
      ApiEnvelope<Booking>,
      {id: string; rating: number; review?: string}
    >({
      query: ({id, ...body}) => ({
        url: `/bookings/${id}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bookings'],
    }),
    createCustomerBooking: builder.mutation<
      ApiEnvelope<Booking>,
      CustomerBookingPayload
    >({
      query: body => ({url: '/bookings', method: 'POST', body}),
      invalidatesTags: ['Bookings', 'Slots', 'Memberships'],
    }),
    startStripeBookingCheckout: builder.mutation<
      ApiEnvelope<{url: string; sessionId: string}>,
      {bookingId: string}
    >({
      query: body => ({
        url: '/payment/stripe/booking-checkout',
        method: 'POST',
        body,
      }),
    }),
    confirmStripeBookingPayment: builder.mutation<
      ApiEnvelope<Booking>,
      {sessionId: string}
    >({
      query: body => ({url: '/payment/stripe/confirm', method: 'POST', body}),
      invalidatesTags: ['Bookings'],
    }),
    getMyMemberships: builder.query<ListEnvelope<Membership>, void>({
      query: () => '/memberships/mine',
      transformResponse: (response: RawListResponse<Membership>) =>
        normalizeList(response),
      providesTags: ['Memberships'],
    }),
    getMembershipPlans: builder.query<ListEnvelope<MembershipPlan>, void>({
      query: () => ({url: '/plans', params: {status: 'Active'}}),
      transformResponse: (response: RawListResponse<MembershipPlan>) =>
        normalizeList(response),
      providesTags: ['Plans'],
    }),
    getMembershipOffers: builder.query<
      ListEnvelope<MembershipOffer>,
      string
    >({
      query: planId => ({
        url: '/offers',
        params: {planId, status: 'Active'},
      }),
      transformResponse: (response: RawListResponse<MembershipOffer>) => {
        const now = Date.now();
        return {
          ...normalizeList(response),
          data: normalizeList(response).data.filter(
            offer =>
              new Date(offer.startDate).getTime() <= now &&
              new Date(offer.endDate).getTime() >= now,
          ),
        };
      },
      providesTags: ['Offers'],
    }),
    purchaseMembership: builder.mutation<
      ApiEnvelope<Membership>,
      {carId: string; planId: string; offerId?: string; startDate?: string}
    >({
      query: body => ({url: '/memberships/purchase', method: 'POST', body}),
      invalidatesTags: ['Memberships'],
    }),
    startStripeMembershipCheckout: builder.mutation<
      ApiEnvelope<{url: string; sessionId: string}>,
      {membershipId: string}
    >({
      query: body => ({
        url: '/payment/stripe/membership-checkout',
        method: 'POST',
        body,
      }),
    }),
    confirmStripeMembershipPayment: builder.mutation<
      ApiEnvelope<Membership>,
      {sessionId: string}
    >({
      query: body => ({url: '/payment/stripe/confirm', method: 'POST', body}),
      invalidatesTags: ['Memberships'],
    }),
  }),
});

export const {
  useGetCustomerProfileQuery,
  useGetMyCarsQuery,
  useUploadImageMutation,
  useCreateCustomerCarMutation,
  useUpdateCustomerCarMutation,
  useDeleteCustomerCarMutation,
  useGetMySocietiesQuery,
  useCreateCustomerSocietyMutation,
  useGetMyFlatsQuery,
  useCreateCustomerFlatMutation,
  useUpdateCustomerFlatMutation,
  useDeleteCustomerFlatMutation,
  useGetWashServicesQuery,
  useGetAvailableSlotsQuery,
  useGetMyBookingsQuery,
  useGetMyPaymentTransactionsQuery,
  useCreateCashReceiptLinkMutation,
  useUpdateCustomerBookingMutation,
  useSubmitBookingReviewMutation,
  useCreateCustomerBookingMutation,
  useStartStripeBookingCheckoutMutation,
  useConfirmStripeBookingPaymentMutation,
  useGetMyMembershipsQuery,
  useGetMembershipPlansQuery,
  useGetMembershipOffersQuery,
  usePurchaseMembershipMutation,
  useStartStripeMembershipCheckoutMutation,
  useConfirmStripeMembershipPaymentMutation,
} = customerApi;

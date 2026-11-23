import { baseApi } from "@/redux/api/baseApi";

export type TOfferStatus = "Active" | "Inactive";
export type TOfferDiscountType = "Percentage" | "Fixed";

export type TOfferPlan = {
  _id: string;
  name: string;
  price: number;
  status?: string;
  societyId?: string | { _id: string; name?: string; city?: string };
};

export type TOffer = {
  _id: string;
  planId: string | TOfferPlan;
  title: string;
  description?: string;
  discountType: TOfferDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  status: TOfferStatus;
  couponCode?: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  redeemedCount?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TOfferPayload = {
  planId: string;
  title: string;
  description?: string;
  discountType: TOfferDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  status: TOfferStatus;
  couponCode?: string;
  usageLimit?: number | null;
  perCustomerLimit?: number;
};

type TOfferResponse = {
  success: boolean;
  message: string;
  data: TOffer | { result: TOffer[]; total: number };
};

export const offerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateCoupon: builder.mutation<
      { success: boolean; data: { offerId: string; code: string; discountAmount: number } },
      { planId: string; code: string }
    >({
      query: (body) => ({
        url: "/offers/coupon/validate",
        method: "POST",
        body,
      }),
    }),
    getMyReferral: builder.query<
      {
        success: boolean;
        data: {
          code: string;
          rewardAmount: number;
          totalReferrals: number;
          completedReferrals: number;
          pendingReferrals: number;
          earnedAmount: number;
          referrals: unknown[];
        };
      },
      void
    >({
      query: () => ({ url: "/offers/referral/me" }),
    }),
    redeemReferralCode: builder.mutation<
      { success: boolean; data: unknown },
      { code: string }
    >({
      query: (body) => ({
        url: "/offers/referral/redeem",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Offer"],
    }),
    getReferrals: builder.query<
      { success: boolean; data: unknown[] },
      void
    >({
      query: () => ({ url: "/offers/referrals" }),
      providesTags: ["Offer"],
    }),
    getOffers: builder.query<
      TOfferResponse,
      { planId?: string; status?: TOfferStatus; search?: string } | void
    >({
      query: (params) => ({
        url: "/offers",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["Offer"],
    }),
    createOffer: builder.mutation<TOfferResponse, TOfferPayload>({
      query: (body) => ({ url: "/offers", method: "POST", body }),
      invalidatesTags: ["Offer"],
    }),
    updateOffer: builder.mutation<
      TOfferResponse,
      { id: string; data: Partial<TOfferPayload> }
    >({
      query: ({ id, data }) => ({
        url: `/offers/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Offer"],
    }),
    deleteOffer: builder.mutation<TOfferResponse, string>({
      query: (id) => ({ url: `/offers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Offer"],
    }),
  }),
});

export const {
  useGetOffersQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useDeleteOfferMutation,
  useValidateCouponMutation,
  useGetMyReferralQuery,
  useRedeemReferralCodeMutation,
  useGetReferralsQuery,
} = offerApi;

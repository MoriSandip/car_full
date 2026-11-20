import {api} from './api';
import type {AppRole, AppUser} from './auth.slice';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type LoginResponse = {
  accessToken: string;
  customer?: AppUser;
  worker?: AppUser;
};

type CustomerLoginPayload = {
  email: string;
  password: string;
};
type CustomerRegisterPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  profileImage?: {
    image: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  };
};
type PasswordResetRole = 'CUSTOMER' | 'WORKER';
type PasswordResetRequest = {email: string; role: PasswordResetRole};
type PasswordResetPayload = PasswordResetRequest & {
  code: string;
  newPassword: string;
};
type LoginOtpRequest = {
  role: 'CUSTOMER' | 'WORKER';
  channel: 'email' | 'phone';
  identifier: string;
};
type LoginOtpVerification = LoginOtpRequest & {code: string};

export const authApi = api.injectEndpoints({
  endpoints: builder => ({
    customerLogin: builder.mutation<
      ApiResponse<LoginResponse>,
      CustomerLoginPayload
    >({
      query: body => ({url: '/customers/login', method: 'POST', body}),
    }),
    customerRegister: builder.mutation<
      ApiResponse<AppUser>,
      CustomerRegisterPayload
    >({
      query: body => ({url: '/customers/register', method: 'POST', body}),
    }),
    workerLogin: builder.mutation<
      ApiResponse<LoginResponse>,
      CustomerLoginPayload
    >({
      query: body => ({url: '/workers/login', method: 'POST', body}),
    }),
    requestLoginOtp: builder.mutation<
      ApiResponse<{destination: string; developmentOtp?: string}>,
      LoginOtpRequest
    >({
      query: ({role, ...body}) => ({
        url: '/auth/otp/request',
        method: 'POST',
        body: {...body, role: role.toLowerCase()},
      }),
    }),
    verifyLoginOtp: builder.mutation<
      ApiResponse<LoginResponse>,
      LoginOtpVerification
    >({
      query: ({role, ...body}) => ({
        url: '/auth/otp/verify',
        method: 'POST',
        body: {...body, role: role.toLowerCase()},
      }),
    }),
    requestPasswordReset: builder.mutation<
      ApiResponse<null>,
      PasswordResetRequest
    >({
      query: body => ({url: '/auth/password/forgot', method: 'POST', body}),
    }),
    resetPassword: builder.mutation<ApiResponse<null>, PasswordResetPayload>({
      query: body => ({url: '/auth/password/reset', method: 'POST', body}),
    }),
  }),
});

export const {
  useCustomerLoginMutation,
  useCustomerRegisterMutation,
  useWorkerLoginMutation,
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
} = authApi;

export const userFromLogin = (
  response: ApiResponse<LoginResponse>,
  role: AppRole,
) => {
  const user = role === 'CUSTOMER' ? response.data.customer : response.data.worker;
  if (!response.data.accessToken || !user) {
    throw new Error('The sign-in response did not include a user and access token.');
  }
  return {token: response.data.accessToken, user: {...user, role}};
};

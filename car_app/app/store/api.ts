import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';
import { API_BASE_URL } from '../config/api';
import { clearCredentials } from './auth.slice';
import {
  beginApiRequest,
  requiresApiConfirmation,
  requestApiConfirmation,
} from './request-ui';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const responseMessage = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('message' in value)) {
    return undefined;
  }
  const { message } = value;
  return typeof message === 'string' && message.trim() ? message : undefined;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: async (args, apiContext, extraOptions) => {
    if (!API_BASE_URL) {
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'API_ORIGIN_NOT_CONFIGURED',
          data: {
            message:
              'Set the mobile app apiOrigin in app.json to the deployed HTTPS API.',
          },
        },
      };
    }

    const needsConfirmation =
      apiContext.type === 'mutation' &&
      requiresApiConfirmation(apiContext.endpoint);
    if (needsConfirmation) {
      const confirmed = await requestApiConfirmation(apiContext.endpoint);
      if (!confirmed) {
        return {
          error: {
            status: 'CUSTOM_ERROR' as const,
            error: 'ACTION_CANCELLED',
            data: { code: 'ACTION_CANCELLED', message: 'Action cancelled.' },
          },
        };
      }
    }

    const finishRequest =
      apiContext.type === 'mutation' ? beginApiRequest() : undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = rawBaseQuery(args, apiContext, extraOptions);
      const timeout = new Promise<Awaited<typeof request>>(resolve => {
        timeoutId = setTimeout(() => {
          apiContext.abort('Request timed out');
          resolve({
            error: {
              status: 'CUSTOM_ERROR',
              error: 'Request timed out',
              data: { message: 'The request timed out. Please try again.' },
            },
          });
        }, 15_000);
      });
      const response = await Promise.race([request, timeout]);
      if (response.error?.status === 401) {
        const state = apiContext.getState() as RootState;
        if (state.auth.token) {
          apiContext.dispatch(clearCredentials());
          apiContext.dispatch(api.util.resetApiState());
        }
      }
      if (finishRequest) {
        const errorMessage =
          response.error && 'data' in response.error
            ? responseMessage(response.error.data)
            : undefined;
        const successMessage = responseMessage(
          !response.error ? response.data : undefined,
        );
        if (needsConfirmation) {
          finishRequest({
            success: !response.error,
            title: response.error ? 'Action failed' : 'Action completed',
            message:
              errorMessage ||
              successMessage ||
              (response.error
                ? 'The action could not be completed. Please try again.'
                : 'Your changes have been saved successfully.'),
          });
        }
      }
      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      finishRequest?.();
    }
  },
  tagTypes: [
    'Bookings',
    'Cars',
    'Flats',
    'Societies',
    'Services',
    'Slots',
    'Profile',
    'Attendance',
    'Memberships',
    'Plans',
    'Offers',
    'LeaveRequests',
    'Payroll',
    'Complaints',
  ],
  endpoints: () => ({}),
});

import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {RootState} from './store';
import {API_BASE_URL} from '../config/api';
import {clearCredentials} from './auth.slice';
import {
  beginApiRequest,
  requiresApiConfirmation,
  requestApiConfirmation,
} from './request-ui';

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const requestSignal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const controller = new AbortController();
  const abortRequest = () => controller.abort(requestSignal?.reason);

  if (requestSignal?.aborted) {
    abortRequest();
  } else {
    requestSignal?.addEventListener('abort', abortRequest, {once: true});
  }

  const timeoutId = setTimeout(() => {
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'TimeoutError';
    controller.abort(timeoutError);
  }, 15_000);

  try {
    return await fetch(input, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timeoutId);
    requestSignal?.removeEventListener('abort', abortRequest);
  }
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  fetchFn: fetchWithTimeout,
  prepareHeaders: (headers, {getState}) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
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

    if (
      apiContext.type === 'mutation' &&
      requiresApiConfirmation(apiContext.endpoint)
    ) {
      const confirmed = await requestApiConfirmation(apiContext.endpoint);
      if (!confirmed) {
        return {
          error: {
            status: 'CUSTOM_ERROR' as const,
            error: 'ACTION_CANCELLED',
            data: {code: 'ACTION_CANCELLED', message: 'Action cancelled.'},
          },
        };
      }
    }

    const finishRequest =
      apiContext.type === 'mutation' ? beginApiRequest() : undefined;
    try {
      const response = await rawBaseQuery(args, apiContext, extraOptions);
      if (response.error?.status === 401) {
        const state = apiContext.getState() as RootState;
        if (state.auth.token) {
          apiContext.dispatch(clearCredentials());
          apiContext.dispatch(api.util.resetApiState());
        }
      }
      return response;
    } finally {
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
  ],
  endpoints: () => ({}),
});

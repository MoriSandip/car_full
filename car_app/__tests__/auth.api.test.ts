import {configureStore} from '@reduxjs/toolkit';
import authReducer, {setCredentials} from '../app/store/auth.slice';
import {api} from '../app/store/api';
import {authApi, userFromLogin} from '../app/store/auth.api';
import {customerApi} from '../app/store/customer.api';

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(api.middleware),
    enhancers: getDefaultEnhancers =>
      getDefaultEnhancers({autoBatch: false}),
  });

describe('mobile authentication API', () => {
  let store: ReturnType<typeof createTestStore>;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    store = createTestStore();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    store.dispatch(api.util.resetApiState());
    fetchMock.mockRestore();
  });

  it('saves a customer session directly after a successful password login', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'customer-test-token',
              customer: {
                _id: 'customer-1',
                name: 'Test Customer',
                email: 'customer@example.com',
                phone: '1234567890',
              },
            },
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              _id: 'customer-1',
              name: 'Test Customer',
              email: 'customer@example.com',
              phone: '1234567890',
            },
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      );

    const loginRequest = store.dispatch(
      authApi.endpoints.customerLogin.initiate({
        email: 'customer@example.com',
        password: 'test-password',
      }),
    );
    const login = await loginRequest.unwrap();
    store.dispatch(setCredentials(userFromLogin(login, 'CUSTOMER')));
    const profileQuery = store.dispatch(
      customerApi.endpoints.getCustomerProfile.initiate(),
    );
    await profileQuery.unwrap();
    profileQuery.unsubscribe();

    const [loginFetchRequest, profileRequest] = fetchMock.mock.calls.map(
      ([request]) => request as Request,
    );

    expect(loginFetchRequest.url).toBe(
      'http://192.168.1.18:3000/api/v1/customers/login',
    );
    expect(loginFetchRequest.method).toBe('POST');
    expect(profileRequest.url).toContain('/api/v1/customers/me');
    expect(profileRequest.headers.get('authorization')).toBe(
      'Bearer customer-test-token',
    );
  });

  it('calls worker login using the worker endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'worker-test-token',
            worker: {
              _id: 'worker-1',
              name: 'Test Worker',
              email: 'worker@example.com',
              phone: '1234567890',
            },
          },
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    const loginRequest = store.dispatch(
      authApi.endpoints.workerLogin.initiate({
        email: 'worker@example.com',
        password: 'test-password',
      }),
    );
    const response = await loginRequest.unwrap();
    expect(response.data.accessToken).toBe('worker-test-token');

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/workers/login');
    expect(request.method).toBe('POST');
  });

  it('requests and verifies a phone OTP for a customer', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Development OTP prepared.',
            data: {destination: '******7890', developmentOtp: '123456'},
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'customer-otp-token',
              customer: {
                _id: 'customer-1',
                name: 'Test Customer',
                email: 'customer@example.com',
                phone: '1234567890',
              },
            },
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      );

    await store
      .dispatch(
        authApi.endpoints.requestLoginOtp.initiate({
          role: 'CUSTOMER',
          channel: 'phone',
          identifier: '1234567890',
        }),
      )
      .unwrap();
    const login = await store
      .dispatch(
        authApi.endpoints.verifyLoginOtp.initiate({
          role: 'CUSTOMER',
          channel: 'phone',
          identifier: '1234567890',
          code: '123456',
        }),
      )
      .unwrap();
    expect(userFromLogin(login, 'CUSTOMER').token).toBe(
      'customer-otp-token',
    );

    const [requestOtp, verifyOtp] = fetchMock.mock.calls.map(
      ([request]) => request as Request,
    );
    expect(requestOtp.url).toContain('/api/v1/auth/otp/request');
    expect(await requestOtp.clone().json()).toEqual({
      channel: 'phone',
      identifier: '1234567890',
      role: 'customer',
    });
    expect(verifyOtp.url).toContain('/api/v1/auth/otp/verify');
    expect(await verifyOtp.clone().json()).toEqual({
      channel: 'phone',
      identifier: '1234567890',
      code: '123456',
      role: 'customer',
    });
  });
});

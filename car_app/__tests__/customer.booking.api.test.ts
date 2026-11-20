import {configureStore} from '@reduxjs/toolkit';
import authReducer, {setCredentials} from '../app/store/auth.slice';
import {api} from '../app/store/api';
import {customerApi} from '../app/store/customer.api';
import {workerApi} from '../app/store/worker.api';
import {
  getRequestUiSnapshot,
  resolveApiConfirmation,
  subscribeToRequestUi,
} from '../app/store/request-ui';
import type {CustomerBookingPayload} from '../app/store/customer.api';

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

describe('customer booking API', () => {
  let store: ReturnType<typeof createTestStore>;
  let fetchMock: jest.SpyInstance;
  let unsubscribeConfirmation: () => void;

  beforeEach(() => {
    unsubscribeConfirmation = subscribeToRequestUi(() => {
      if (getRequestUiSnapshot().confirmation) {
        resolveApiConfirmation(true);
      }
    });
    store = createTestStore();
    store.dispatch(
      setCredentials({
        token: 'customer-test-token',
        user: {
          _id: 'customer-1',
          name: 'Test Customer',
          email: 'customer@example.com',
          role: 'CUSTOMER',
        },
      }),
    );
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    store.dispatch(api.util.resetApiState());
    fetchMock.mockRestore();
    unsubscribeConfirmation();
  });

  it('loads history from the customer-only mounted route', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            data: [{_id: 'booking-1', status: 'Pending'}],
            meta: {page: 1, limit: 100, total: 1, totalPage: 1},
          },
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    const request = store.dispatch(
      customerApi.endpoints.getMyBookings.initiate(),
    );
    const result = await request.unwrap();
    request.unsubscribe();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/bookings/mine');
    expect(fetchRequest.headers.get('authorization')).toBe(
      'Bearer customer-test-token',
    );
    expect(result.data).toEqual([{_id: 'booking-1', status: 'Pending'}]);
  });

  it('does not block the app while a screen data query is pending', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          resolveFetch = resolve;
        }),
    );

    const request = store.dispatch(
      customerApi.endpoints.getMyBookings.initiate(),
    );
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(getRequestUiSnapshot().activeRequests).toBe(0);
    resolveFetch?.(
      new Response(
        JSON.stringify({success: true, data: {data: []}}),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );
    await request.unwrap();
    request.unsubscribe();
  });

  it('loads the signed-in customer payment history with method filters', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: [{_id: 'cash-payment-1', provider: 'Cash', status: 'Paid'}],
          meta: {page: 1, limit: 20, total: 1, totalPages: 1},
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    const request = store.dispatch(
      customerApi.endpoints.getMyPaymentTransactions.initiate({
        page: 1,
        provider: 'Cash',
      }),
    );
    const result = await request.unwrap();
    request.unsubscribe();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/payment/my-transactions');
    expect(fetchRequest.url).toContain('provider=Cash');
    expect(fetchRequest.headers.get('authorization')).toBe(
      'Bearer customer-test-token',
    );
    expect(result.data[0].provider).toBe('Cash');
  });

  it('posts the active Booking API individual-booking fields', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {_id: 'booking-1', status: 'Pending'},
        }),
        {status: 201, headers: {'content-type': 'application/json'}},
      ),
    );

    const payload: CustomerBookingPayload = {
      societyId: '507f1f77bcf86cd799439011',
      flatId: '507f1f77bcf86cd799439012',
      carId: '507f1f77bcf86cd799439013',
      serviceId: '507f1f77bcf86cd799439014',
      slotId: '507f1f77bcf86cd799439015',
      bookingDate: '2026-10-31',
      bookingTime: '09:30',
      paymentType: 'Individual' as const,
    };

    await store
      .dispatch(customerApi.endpoints.createCustomerBooking.initiate(payload))
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/bookings');
    expect(fetchRequest.method).toBe('POST');
    expect(await fetchRequest.clone().json()).toEqual(payload);
  });

  it('posts cash as the payment method for an individual booking', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {_id: 'booking-cash', status: 'Pending'},
        }),
        {status: 201, headers: {'content-type': 'application/json'}},
      ),
    );

    const payload: CustomerBookingPayload = {
      societyId: '507f1f77bcf86cd799439011',
      flatId: '507f1f77bcf86cd799439012',
      carId: '507f1f77bcf86cd799439013',
      serviceId: '507f1f77bcf86cd799439014',
      slotId: '507f1f77bcf86cd799439015',
      bookingDate: '2026-11-18',
      bookingTime: '09:30',
      paymentType: 'Individual',
      paymentMethod: 'Cash',
    };

    await store
      .dispatch(customerApi.endpoints.createCustomerBooking.initiate(payload))
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(await fetchRequest.clone().json()).toEqual(payload);
  });

  it('records cash collection status as part of worker task completion', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {_id: 'booking-cash', paymentStatus: 'Paid'},
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    await store
      .dispatch(
        workerApi.endpoints.performWorkAction.initiate({
          bookingId: 'booking-cash',
          action: 'done',
          cashReceived: true,
        }),
      )
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain(
      '/api/v1/workers/assigned-bookings/booking-cash/work-action',
    );
    expect(fetchRequest.method).toBe('PATCH');
    await expect(fetchRequest.json()).resolves.toEqual({
      action: 'done',
      cashReceived: true,
    });
  });

  it('posts a membership booking with the selected membership ID', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {_id: 'booking-2', status: 'Confirmed'},
        }),
        {status: 201, headers: {'content-type': 'application/json'}},
      ),
    );

    const payload: CustomerBookingPayload = {
      societyId: '507f1f77bcf86cd799439011',
      flatId: '507f1f77bcf86cd799439012',
      carId: '507f1f77bcf86cd799439013',
      serviceId: '507f1f77bcf86cd799439014',
      slotId: '507f1f77bcf86cd799439015',
      bookingDate: '2026-11-03',
      bookingTime: '09:30',
      paymentType: 'Membership',
      membershipId: '507f1f77bcf86cd799439016',
    };

    await store
      .dispatch(customerApi.endpoints.createCustomerBooking.initiate(payload))
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(await fetchRequest.clone().json()).toEqual(payload);
  });

  it('loads customer-owned memberships only', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: [{_id: 'membership-1', status: 'Active'}],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    const request = store.dispatch(
      customerApi.endpoints.getMyMemberships.initiate(),
    );
    const result = await request.unwrap();
    request.unsubscribe();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/memberships/mine');
    expect(result.data).toEqual([{_id: 'membership-1', status: 'Active'}]);
  });

  it('uploads car images through the authenticated server endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {url: 'https://images.example/car.jpg'},
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    await store
      .dispatch(
        customerApi.endpoints.uploadImage.initiate({
          image: '/9j/4AAQSkZJRg==',
          mimeType: 'image/jpeg',
        }),
      )
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/uploads/images');
    expect(fetchRequest.headers.get('authorization')).toBe(
      'Bearer customer-test-token',
    );
    expect(await fetchRequest.clone().json()).toEqual({
      image: '/9j/4AAQSkZJRg==',
      mimeType: 'image/jpeg',
    });
  });

  it('starts membership purchase through the customer-only route', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {_id: 'membership-1', paymentStatus: 'Pending'},
        }),
        {status: 201, headers: {'content-type': 'application/json'}},
      ),
    );

    const payload = {
      carId: '507f1f77bcf86cd799439013',
      planId: '507f1f77bcf86cd799439014',
      offerId: '507f1f77bcf86cd799439015',
    };
    await store
      .dispatch(customerApi.endpoints.purchaseMembership.initiate(payload))
      .unwrap();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/memberships/purchase');
    expect(fetchRequest.method).toBe('POST');
    expect(await fetchRequest.clone().json()).toEqual(payload);
  });

  it('does not send a mutation when its custom confirmation is cancelled', async () => {
    unsubscribeConfirmation();
    unsubscribeConfirmation = subscribeToRequestUi(() => {
      if (getRequestUiSnapshot().confirmation) {
        resolveApiConfirmation(false);
      }
    });

    const request = store.dispatch(
      customerApi.endpoints.purchaseMembership.initiate({
        carId: '507f1f77bcf86cd799439013',
        planId: '507f1f77bcf86cd799439014',
      }),
    );

    await expect(request.unwrap()).rejects.toMatchObject({
      error: 'ACTION_CANCELLED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

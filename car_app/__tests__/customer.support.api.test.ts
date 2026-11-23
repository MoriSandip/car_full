import {configureStore} from '@reduxjs/toolkit';
import authReducer, {setCredentials} from '../app/store/auth.slice';
import {api} from '../app/store/api';
import {customerApi} from '../app/store/customer.api';
import {
  getRequestUiSnapshot,
  resolveApiConfirmation,
  subscribeToRequestUi,
} from '../app/store/request-ui';

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(api.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({autoBatch: false}),
  });

describe('customer support API', () => {
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

  it('loads customer-owned support tickets from the authenticated endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            data: [{_id: 'ticket-1', ticketNo: 'CS-20260101-ABC12345'}],
            meta: {page: 1, limit: 100, total: 1, totalPages: 1},
          },
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      ),
    );

    const request = store.dispatch(
      customerApi.endpoints.getMySupportTickets.initiate(),
    );
    const result = await request.unwrap();
    request.unsubscribe();

    const fetchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(fetchRequest.url).toContain('/api/v1/complaints/mine');
    expect(fetchRequest.headers.get('authorization')).toBe(
      'Bearer customer-test-token',
    );
    expect(result.data).toEqual([
      {_id: 'ticket-1', ticketNo: 'CS-20260101-ABC12345'},
    ]);
  });

  it('creates a ticket and posts customer replies to its thread endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {_id: 'ticket-1', status: 'Open'},
          }),
          {status: 201, headers: {'content-type': 'application/json'}},
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {_id: 'ticket-1', status: 'Open'},
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      );

    const payload = {
      category: 'Booking' as const,
      subject: 'Booking needs review',
      message: 'Please check the booking time.',
    };
    await store
      .dispatch(customerApi.endpoints.createSupportTicket.initiate(payload))
      .unwrap();
    await store
      .dispatch(
        customerApi.endpoints.replyToSupportTicket.initiate({
          id: 'ticket-1',
          message: 'I can provide more details.',
        }),
      )
      .unwrap();

    const createRequest = fetchMock.mock.calls[0][0] as Request;
    expect(createRequest.url).toContain('/api/v1/complaints');
    expect(createRequest.method).toBe('POST');
    await expect(createRequest.clone().json()).resolves.toEqual(payload);

    const replyRequest = fetchMock.mock.calls[1][0] as Request;
    expect(replyRequest.url).toContain(
      '/api/v1/complaints/mine/ticket-1/replies',
    );
    await expect(replyRequest.clone().json()).resolves.toEqual({
      message: 'I can provide more details.',
    });
  });
});

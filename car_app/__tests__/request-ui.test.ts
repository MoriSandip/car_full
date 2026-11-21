import {
  beginApiRequest,
  dismissApiOutcome,
  getRequestUiSnapshot,
  requestApiConfirmation,
  resolveApiConfirmation,
} from '../app/store/request-ui';

describe('mobile API request UI', () => {
  it('resolves queued confirmations and tracks the request result', async () => {
    const confirmation = requestApiConfirmation('updateCustomerCarMutation');
    expect(getRequestUiSnapshot().confirmation?.title).toBe('Confirm action');

    resolveApiConfirmation(true);
    await expect(confirmation).resolves.toBe(true);

    const finishRequest = beginApiRequest();
    expect(getRequestUiSnapshot().activeRequests).toBe(1);
    finishRequest({
      success: true,
      title: 'Action completed',
      message: 'Your changes have been saved successfully.',
    });

    expect(getRequestUiSnapshot()).toMatchObject({
      activeRequests: 0,
      outcome: {
        success: true,
        title: 'Action completed',
      },
    });
    dismissApiOutcome();
    expect(getRequestUiSnapshot().outcome).toBeNull();
  });

  it('ends a request without a result when no confirmation is required', () => {
    const finishRequest = beginApiRequest();
    finishRequest();

    expect(getRequestUiSnapshot()).toMatchObject({
      activeRequests: 0,
      outcome: null,
    });
  });

  it('does not start a mutation after confirmation is cancelled', async () => {
    const confirmation = requestApiConfirmation('deleteCustomerCarMutation');
    resolveApiConfirmation(false);

    await expect(confirmation).resolves.toBe(false);
    expect(getRequestUiSnapshot()).toMatchObject({
      activeRequests: 0,
      confirmation: null,
      outcome: null,
    });
  });
});

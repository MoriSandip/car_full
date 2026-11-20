let mockStoredValue: string | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => mockStoredValue),
  setItem: jest.fn(async (_key: string, value: string) => {
    mockStoredValue = value;
  }),
}));

import {
  getPendingStripePayments,
  removePendingStripePayment,
  savePendingStripePayment,
} from '../app/store/pending-payment';

describe('pending Stripe payment recovery', () => {
  beforeEach(() => {
    mockStoredValue = null;
  });

  it('stores booking and membership sessions without duplicating a session', async () => {
    await savePendingStripePayment({sessionId: 'cs_booking', kind: 'booking'});
    await savePendingStripePayment({sessionId: 'cs_membership', kind: 'membership'});
    await savePendingStripePayment({sessionId: 'cs_booking', kind: 'booking'});

    await expect(getPendingStripePayments()).resolves.toEqual([
      {sessionId: 'cs_membership', kind: 'membership'},
      {sessionId: 'cs_booking', kind: 'booking'},
    ]);
  });

  it('removes a session after confirmation', async () => {
    await savePendingStripePayment({sessionId: 'cs_booking', kind: 'booking'});
    await removePendingStripePayment('cs_booking');

    await expect(getPendingStripePayments()).resolves.toEqual([]);
  });

  it('rejects malformed saved data instead of hiding a storage error', async () => {
    mockStoredValue = '{invalid';

    await expect(getPendingStripePayments()).rejects.toThrow();
  });
});

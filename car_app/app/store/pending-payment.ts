import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'carwash.pending-stripe-sessions';

export type PendingStripePayment = {
  sessionId: string;
  kind: 'booking' | 'membership';
};

export const savePendingStripePayment = async (
  payment: PendingStripePayment,
) => {
  const payments = await getPendingStripePayments();
  const next = [
    ...payments.filter(item => item.sessionId !== payment.sessionId),
    payment,
  ];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const getPendingStripePayments = async () => {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error('Saved payment sessions have an invalid format');
  }

  return parsed.filter(
    (payment): payment is PendingStripePayment =>
      typeof payment?.sessionId === 'string' &&
      (payment.kind === 'booking' || payment.kind === 'membership'),
  );
};

export const removePendingStripePayment = async (sessionId: string) => {
  const payments = await getPendingStripePayments();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(payments.filter(payment => payment.sessionId !== sessionId)),
  );
};

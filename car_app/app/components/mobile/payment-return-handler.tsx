import {useEffect, useRef} from 'react';
import {Alert, AppState, type AppStateStatus} from 'react-native';
import {customerApi} from '../../store/customer.api';
import {useAppSelector} from '../../store/hooks';
import {store} from '../../store/store';
import {
  getPendingStripePayments,
  removePendingStripePayment,
} from '../../store/pending-payment';

const PaymentReturnHandler = () => {
  const token = useAppSelector(state => state.auth.token);
  const processing = useRef(false);
  const alertedSessions = useRef(new Set<string>());

  useEffect(() => {
    let active = true;

    const confirmPendingPayments = async () => {
      if (processing.current || !token) return;

      processing.current = true;
      try {
        const payments = await getPendingStripePayments();
        for (const payment of payments) {
          if (!active) break;
          try {
            if (payment.kind === 'booking') {
              await store
                .dispatch(
                  customerApi.endpoints.confirmStripeBookingPayment.initiate({
                    sessionId: payment.sessionId,
                  }),
                )
                .unwrap();
            } else {
              await store
                .dispatch(
                  customerApi.endpoints.confirmStripeMembershipPayment.initiate({
                    sessionId: payment.sessionId,
                  }),
                )
                .unwrap();
            }
            await removePendingStripePayment(payment.sessionId);
            alertedSessions.current.delete(payment.sessionId);
          } catch {
            console.warn(
              `Could not confirm returned Stripe ${payment.kind} payment.`,
            );
            if (!alertedSessions.current.has(payment.sessionId)) {
              alertedSessions.current.add(payment.sessionId);
              Alert.alert(
                'Payment not confirmed yet',
                'Your booking or membership will update after Stripe confirms payment. Return to this app while online to retry.',
              );
            }
          }
        }
      } catch {
        console.warn('Could not restore pending Stripe payments.');
      } finally {
        processing.current = false;
      }
    };

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        confirmPendingPayments().then(
          () => undefined,
          () => undefined,
        );
      }
    };

    if (AppState.currentState === 'active') {
      confirmPendingPayments().then(
        () => undefined,
        () => undefined,
      );
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [token]);

  return null;
};

export default PaymentReturnHandler;

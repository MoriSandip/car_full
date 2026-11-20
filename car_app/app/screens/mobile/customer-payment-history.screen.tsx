import React, {useState} from 'react';
import {Alert, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {
  useCreateCashReceiptLinkMutation,
  useGetMyPaymentTransactionsQuery,
} from '../../store/customer.api';
import type {CustomerPaymentTransaction} from '../../store/customer.api';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';

type Props = BottomTabScreenProps<NavigatorParamList, 'CustomerTransactions'>;
type ProviderFilter = '' | 'Stripe' | 'Cash' | 'UPI';
type StatusFilter = '' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';

const providerFilters: {label: string; value: ProviderFilter}[] = [
  {label: 'All', value: ''},
  {label: 'Online', value: 'Stripe'},
  {label: 'Cash', value: 'Cash'},
  {label: 'UPI', value: 'UPI'},
];
const statusFilters: {label: string; value: StatusFilter}[] = [
  {label: 'All', value: ''},
  {label: 'Paid', value: 'Paid'},
  {label: 'Pending', value: 'Pending'},
  {label: 'Failed', value: 'Failed'},
  {label: 'Refunded', value: 'Refunded'},
];

const formatMoney = (amount: number) => `₹${Number(amount || 0).toFixed(2)}`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(date);
};

const PaymentRow = ({
  transaction,
  onReceipt,
  receiptDisabled,
}: {
  transaction: CustomerPaymentTransaction;
  onReceipt: (bookingId: string) => void;
  receiptDisabled: boolean;
}) => {
  const booking = transaction.bookingId;
  const membership = transaction.membershipId;
  const title = booking
    ? booking.serviceNameSnapshot || 'Individual booking'
    : 'Membership purchase';
  const details = booking
    ? `${new Date(booking.bookingDate).toLocaleDateString()} · ${booking.bookingTime}`
    : membership
      ? `${new Date(membership.startDate).toLocaleDateString()} – ${new Date(membership.endDate).toLocaleDateString()}`
      : '';
  return (
    <Card style={styles.transactionCard}>
      <View style={styles.row}>
        <Text style={styles.amount}>{formatMoney(transaction.amount)}</Text>
        <Text
          style={[
            styles.status,
            transaction.status === 'Paid' && styles.paid,
            transaction.status === 'Failed' && styles.failed,
          ]}>
          {transaction.status}
        </Text>
      </View>
      <Text style={styles.transactionTitle}>{title}</Text>
      {details ? <Text style={styles.copy}>{details}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.method}>
          {transaction.provider === 'Stripe'
            ? 'Online · Stripe'
            : transaction.provider}
        </Text>
        <Text style={styles.copy}>{formatDate(transaction.createdAt)}</Text>
      </View>
      {transaction.reference ? (
        <Text style={styles.copy}>Reference: {transaction.reference}</Text>
      ) : null}
      {transaction.provider === 'Cash' && transaction.recordedByWorker?.name ? (
        <Text style={styles.copy}>
          Collected by {transaction.recordedByWorker.name}
        </Text>
      ) : null}
      {transaction.provider === 'Cash' &&
      transaction.status === 'Paid' &&
      booking?._id ? (
        <ActionButton
          title="Download cash receipt PDF"
          variant="secondary"
          disabled={receiptDisabled}
          onPress={() => onReceipt(booking._id)}
        />
      ) : null}
    </Card>
  );
};

const CustomerPaymentHistoryScreen = (_props: Props) => {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState<ProviderFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const {data, isLoading, isFetching, isError, refetch} =
    useGetMyPaymentTransactionsQuery({
      page,
      limit: 20,
      ...(provider ? {provider} : {}),
      ...(status ? {status} : {}),
    });
  const [createReceiptLink, receiptState] =
    useCreateCashReceiptLinkMutation();
  const transactions = data?.data ?? [];
  const summary = data?.meta?.summary;
  const totalPages = Math.max(1, data?.meta?.totalPages ?? 1);

  const chooseProvider = (next: ProviderFilter) => {
    setProvider(next);
    setPage(1);
  };
  const chooseStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };
  const openReceipt = async (bookingId: string) => {
    try {
      const result = await createReceiptLink(bookingId).unwrap();
      await Linking.openURL(result.data.url);
    } catch (error) {
      const response = error as {data?: {message?: string}};
      Alert.alert(
        'Receipt unavailable',
        response.data?.message || 'Could not open the cash receipt PDF.',
      );
    }
  };

  return (
    <Page>
      <PageTitle
        title="Payment history"
        subtitle="Review online and cash payments for your bookings and memberships."
      />
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Payment summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total paid</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(summary?.paidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Online paid</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(summary?.onlinePaidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cash paid</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(summary?.cashPaidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(summary?.pendingAmount ?? 0)}
            </Text>
          </View>
        </View>
      </Card>

      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh transactions'}
        variant="secondary"
        disabled={isFetching}
        onPress={() => refetch()}
      />

      <View style={styles.filterBlock}>
        <Text style={styles.filterHeading}>Payment method</Text>
        <View style={styles.filters}>
          {providerFilters.map(item => (
            <FilterChip
              key={item.value || 'all-provider'}
              label={item.label}
              selected={provider === item.value}
              onPress={() => chooseProvider(item.value)}
            />
          ))}
        </View>
        <Text style={styles.filterHeading}>Status</Text>
        <View style={styles.filters}>
          {statusFilters.map(item => (
            <FilterChip
              key={item.value || 'all-status'}
              label={item.label}
              selected={status === item.value}
              onPress={() => chooseStatus(item.value)}
            />
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingMessage text="Loading your payment history..." />
      ) : isError ? (
        <InfoMessage
          text="Payment history could not be loaded. Refresh and try again."
          variant="error"
        />
      ) : transactions.length ? (
        transactions.map(transaction => (
          <PaymentRow
            key={transaction._id}
            transaction={transaction}
            onReceipt={openReceipt}
            receiptDisabled={receiptState.isLoading}
          />
        ))
      ) : (
        <InfoMessage text="No transactions match these filters." />
      )}

      <View style={styles.pagination}>
        <ActionButton
          title="Previous"
          variant="secondary"
          disabled={page <= 1 || isFetching}
          onPress={() => setPage(current => Math.max(1, current - 1))}
          style={styles.pageButton}
        />
        <Text style={styles.pageText}>
          Page {data?.meta?.page ?? page} of {totalPages}
        </Text>
        <ActionButton
          title="Next"
          variant="secondary"
          disabled={page >= totalPages || isFetching}
          onPress={() => setPage(current => current + 1)}
          style={styles.pageButton}
        />
      </View>
    </Page>
  );
};

const FilterChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{selected}}
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}>
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  summaryCard: {gap: 12},
  summaryTitle: {fontSize: 16, fontWeight: '800', color: colors.ink},
  summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  summaryItem: {width: '47%', gap: 4},
  summaryLabel: {fontSize: 12, color: colors.muted},
  summaryValue: {fontSize: 16, fontWeight: '800', color: colors.ink},
  filterBlock: {gap: 9},
  filterHeading: {fontSize: 13, fontWeight: '700', color: colors.ink},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: {backgroundColor: colors.paleBlue, borderColor: colors.primary},
  chipText: {fontSize: 12, fontWeight: '600', color: colors.muted},
  chipTextSelected: {color: colors.primaryDark},
  transactionCard: {gap: 8},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  amount: {fontSize: 18, fontWeight: '800', color: colors.ink},
  status: {fontSize: 12, fontWeight: '700', color: colors.muted},
  paid: {color: colors.success},
  failed: {color: colors.danger},
  transactionTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  copy: {fontSize: 12, lineHeight: 18, color: colors.muted},
  method: {fontSize: 12, fontWeight: '700', color: colors.primaryDark},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageButton: {flex: 1},
  pageText: {fontSize: 12, color: colors.muted},
});

export default CustomerPaymentHistoryScreen;

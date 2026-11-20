import React, {useState} from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  DetailsSheet,
  InfoMessage,
  LoadingMessage,
  ListItemPressable,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {
  useCreateCashReceiptLinkMutation,
  useGetMyPaymentTransactionsQuery,
} from '../../store/customer.api';
import type {CustomerPaymentTransaction} from '../../store/customer.api';
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
  const [detailsVisible, setDetailsVisible] = useState(false);
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
    <>
      <Card style={styles.transactionCard}>
        <ListItemPressable
          accessibilityLabel={`View ${title} payment details`}
          onPress={() => setDetailsVisible(true)}
          style={styles.transactionDetailsTap}>
          <View style={styles.transactionHeader}>
            <View style={styles.amountGroup}>
              <View style={styles.providerIcon}>
                <Feather
                  name={transaction.provider === 'Cash' ? 'dollar-sign' : 'credit-card'}
                  size={17}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.amount} numberOfLines={1}>
                {formatMoney(transaction.amount)}
              </Text>
            </View>
            <Text
              style={[
                styles.status,
                transaction.status === 'Paid' && styles.paid,
                transaction.status === 'Failed' && styles.failed,
                transaction.status === 'Pending' && styles.pending,
                transaction.status === 'Refunded' && styles.refunded,
              ]}>
              {transaction.status}
            </Text>
          </View>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {title}
          </Text>
          {details ? (
            <Text style={styles.copy} numberOfLines={1}>
              {details}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.method}>
              {transaction.provider === 'Stripe'
                ? 'Online · Stripe'
                : transaction.provider}
            </Text>
            <Text style={styles.metaDate} numberOfLines={1}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
          {transaction.reference || transaction.recordedByWorker?.name ? (
            <Text style={styles.copy} numberOfLines={1}>
              {[
                transaction.reference ? `Ref ${transaction.reference}` : '',
                transaction.recordedByWorker?.name
                  ? `Cash by ${transaction.recordedByWorker.name}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>View full details</Text>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </View>
        </ListItemPressable>
        {transaction.provider === 'Cash' &&
        transaction.status === 'Paid' &&
        booking?._id ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download cash receipt PDF"
            disabled={receiptDisabled}
            onPress={() => onReceipt(booking._id)}
            style={[styles.receiptButton, receiptDisabled && styles.disabled]}>
            <Feather name="download" size={15} color={colors.primary} />
            <Text style={styles.receiptText}>Download receipt</Text>
          </Pressable>
        ) : null}
      </Card>
      <DetailsSheet
        visible={detailsVisible}
        setVisible={setDetailsVisible}
        title="Payment details">
        <Text style={styles.transactionTitle}>{title}</Text>
        <PaymentDetail title="Amount" value={formatMoney(transaction.amount)} />
        <PaymentDetail title="Status" value={transaction.status} />
        <PaymentDetail
          title="Payment method"
          value={
            transaction.provider === 'Stripe'
              ? 'Online · Stripe'
              : transaction.provider
          }
        />
        <PaymentDetail
          title="Paid / created on"
          value={formatDate(transaction.createdAt)}
        />
        {transaction.reference ? (
          <PaymentDetail title="Reference" value={transaction.reference} />
        ) : null}
        {transaction.recordedByWorker?.name ? (
          <PaymentDetail
            title="Cash collected by"
            value={transaction.recordedByWorker.name}
          />
        ) : null}
        {booking ? (
          <>
            <Text style={styles.detailSection}>Booking</Text>
            <PaymentDetail
              title="Service"
              value={booking.serviceNameSnapshot || 'Individual booking'}
            />
            <PaymentDetail
              title="Scheduled"
              value={`${new Date(booking.bookingDate).toLocaleDateString()} · ${booking.bookingTime}`}
            />
            <PaymentDetail
              title="Booking status"
              value={booking.status}
            />
            <PaymentDetail
              title="Payment type"
              value={booking.paymentType || 'Individual'}
            />
          </>
        ) : membership ? (
          <>
            <Text style={styles.detailSection}>Membership</Text>
            <PaymentDetail
              title="Validity"
              value={`${new Date(membership.startDate).toLocaleDateString()} – ${
                new Date(membership.endDate).toLocaleDateString()
              }`}
            />
            <PaymentDetail title="Membership status" value={membership.status} />
          </>
        ) : null}
        {transaction.provider === 'Cash' &&
        transaction.status === 'Paid' &&
        booking?._id ? (
          <ActionButton
            title={receiptDisabled ? 'Preparing receipt...' : 'Download cash receipt'}
            onPress={() => onReceipt(booking._id)}
            disabled={receiptDisabled}
            variant="secondary"
          />
        ) : null}
      </DetailsSheet>
    </>
  );
};

const PaymentDetail = ({title, value}: {title: string; value?: string}) => (
  <View style={styles.paymentDetail}>
    <Text style={styles.paymentDetailLabel}>{title}</Text>
    <Text style={styles.paymentDetailValue}>{value || '—'}</Text>
  </View>
);

const CustomerPaymentHistoryScreen = () => {
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
    <Page
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <PageTitle compact
        title="Payment history"
        subtitle="Review online and cash payments for your bookings and memberships."
      />
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Payment summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>Total paid</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(summary?.paidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>Online paid</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(summary?.onlinePaidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>Cash paid</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(summary?.cashPaidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>Pending</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(summary?.pendingAmount ?? 0)}
            </Text>
          </View>
        </View>
      </Card>

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
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="credit-card" size={20} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptyCopy}>
            Try changing the payment method or status filters.
          </Text>
        </Card>
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
  summaryCard: {gap: 9, borderRadius: 14, paddingVertical: 11},
  summaryHeader: {flexDirection: 'row', alignItems: 'center'},
  summaryTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  summaryGrid: {flexDirection: 'row', gap: 7},
  summaryItem: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  summaryLabel: {fontSize: 9, fontWeight: '600', color: colors.muted},
  summaryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
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
  transactionCard: {gap: 7, borderRadius: 14, paddingVertical: 11},
  transactionDetailsTap: {gap: 7},
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  viewDetailsText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  paymentDetail: {
    gap: 3,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paymentDetailLabel: {fontSize: 11, fontWeight: '600', color: colors.muted},
  paymentDetailValue: {fontSize: 14, lineHeight: 20, color: colors.ink},
  detailSection: {fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 4},
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  amountGroup: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8},
  providerIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  amount: {fontSize: 16, fontWeight: '900', color: colors.ink, flexShrink: 1},
  status: {
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: colors.canvas,
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
  },
  paid: {color: colors.success, backgroundColor: '#E8F5EE'},
  failed: {color: colors.danger, backgroundColor: '#FDECEA'},
  pending: {color: '#A15C00', backgroundColor: '#FFF4E5'},
  refunded: {color: '#6941C6', backgroundColor: '#F4EBFF'},
  transactionTitle: {fontSize: 14, fontWeight: '700', color: colors.ink},
  copy: {fontSize: 12, lineHeight: 18, color: colors.muted},
  method: {fontSize: 12, fontWeight: '700', color: colors.primaryDark},
  metaDate: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  receiptButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 7,
  },
  receiptText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  disabled: {opacity: 0.5},
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageButton: {flex: 1},
  pageText: {fontSize: 12, color: colors.muted},
  emptyCard: {alignItems: 'flex-start', gap: 10, borderRadius: 18},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  emptyTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  emptyCopy: {fontSize: 13, lineHeight: 19, color: colors.muted},
});

export default CustomerPaymentHistoryScreen;

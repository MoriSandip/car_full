import React, { useState } from 'react';
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
  FilterBottomSheet,
  InfoMessage,
  LoadingSkeleton,
  ListItemPressable,
  Page,
  SearchFilterBar,
} from '../../components/mobile/ui';
import {
  useCreateCashReceiptLinkMutation,
  useGetMyPaymentTransactionsQuery,
} from '../../store/customer.api';
import type { CustomerPaymentTransaction } from '../../store/customer.api';
type ProviderFilter = '' | 'Stripe' | 'Cash' | 'UPI';
type StatusFilter = '' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';

const providerFilters: { label: string; value: ProviderFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Online', value: 'Stripe' },
  { label: 'Cash', value: 'Cash' },
  { label: 'UPI', value: 'UPI' },
];
const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Refunded', value: 'Refunded' },
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

const paymentStatusStyle = (status: string) => {
  switch (status) {
    case 'Paid':
      return styles.paid;
    case 'Failed':
      return styles.failed;
    case 'Pending':
      return styles.pending;
    case 'Refunded':
      return styles.refunded;
    default:
      return styles.unknownStatus;
  }
};

const paymentStatusTextStyle = (status: string) => {
  switch (status) {
    case 'Paid':
      return styles.paidText;
    case 'Failed':
      return styles.failedText;
    case 'Pending':
      return styles.pendingText;
    case 'Refunded':
      return styles.refundedText;
    default:
      return styles.unknownStatusText;
  }
};

const paymentStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid':
      return 'check-circle';
    case 'Failed':
      return 'x-circle';
    case 'Pending':
      return 'clock';
    case 'Refunded':
      return 'corner-up-left';
    default:
      return 'help-circle';
  }
};

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'Paid':
      return colors.success;
    case 'Failed':
      return colors.danger;
    case 'Pending':
      return '#A15C00';
    case 'Refunded':
      return '#6941C6';
    default:
      return colors.muted;
  }
};

const PaymentStatusPill = ({ status }: { status: string }) => (
  <View style={[styles.statusPill, paymentStatusStyle(status)]}>
    <Feather
      name={paymentStatusIcon(status)}
      size={12}
      color={paymentStatusColor(status)}
    />
    <Text style={[styles.statusText, paymentStatusTextStyle(status)]}>
      {status}
    </Text>
  </View>
);

const SummaryStat = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) => (
  <View style={styles.summaryStat}>
    <View style={styles.summaryStatIcon}>
      <Feather name={icon} size={13} color={colors.primary} />
    </View>
    <Text style={styles.summaryLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text
      style={styles.summaryStatValue}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {formatMoney(value)}
    </Text>
  </View>
);

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
    ? `${new Date(booking.bookingDate).toLocaleDateString()} · ${
        booking.bookingTime
      }`
    : membership
    ? `${new Date(membership.startDate).toLocaleDateString()} – ${new Date(
        membership.endDate,
      ).toLocaleDateString()}`
    : '';
  const providerIcon =
    transaction.provider === 'Cash'
      ? 'dollar-sign'
      : transaction.provider === 'UPI'
      ? 'smartphone'
      : 'credit-card';
  const paymentMethod =
    transaction.provider === 'Stripe'
      ? 'Online · Stripe'
      : transaction.provider;
  return (
    <>
      <Card style={styles.transactionCard}>
        <ListItemPressable
          accessibilityLabel={`View ${title} payment details`}
          onPress={() => setDetailsVisible(true)}
          style={styles.transactionDetailsTap}
        >
          <View style={styles.transactionHeader}>
            <View style={styles.amountGroup}>
              <View style={styles.providerIcon}>
                <Feather name={providerIcon} size={17} color={colors.primary} />
              </View>
              <View style={styles.amountCopy}>
                <Text style={styles.amountLabel}>TRANSACTION AMOUNT</Text>
                <Text style={styles.amount} numberOfLines={1}>
                  {formatMoney(transaction.amount)}
                </Text>
              </View>
            </View>
            <PaymentStatusPill status={transaction.status} />
          </View>
          <View style={styles.transactionCopy}>
            <Text style={styles.transactionTitle} numberOfLines={2}>
              {title}
            </Text>
            {details ? (
              <Text style={styles.copy} numberOfLines={1}>
                {details}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name={providerIcon} size={13} color={colors.primary} />
              <Text style={styles.method}>{paymentMethod}</Text>
            </View>
            <View style={[styles.metaItem, styles.dateMetaItem]}>
              <Feather name="calendar" size={13} color={colors.muted} />
              <Text style={styles.metaDate} numberOfLines={1}>
                {formatDate(transaction.createdAt)}
              </Text>
            </View>
          </View>
          {transaction.reference || transaction.recordedByWorker?.name ? (
            <View style={styles.referenceRow}>
              <Feather name="hash" size={13} color={colors.muted} />
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
            </View>
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
            style={[styles.receiptButton, receiptDisabled && styles.disabled]}
          >
            <Feather name="download" size={15} color={colors.primary} />
            <Text style={styles.receiptText}>Download receipt</Text>
          </Pressable>
        ) : null}
      </Card>
      <DetailsSheet
        visible={detailsVisible}
        setVisible={setDetailsVisible}
        title="Payment details"
      >
        <Card style={styles.paymentHero}>
          <View style={styles.paymentHeroHeader}>
            <View style={styles.providerIconLarge}>
              <Feather name={providerIcon} size={20} color={colors.primary} />
            </View>
            <PaymentStatusPill status={transaction.status} />
          </View>
          <Text style={styles.paymentHeroAmount}>
            {formatMoney(transaction.amount)}
          </Text>
          <Text style={styles.transactionTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.copy}>{paymentMethod}</Text>
        </Card>
        <Card style={styles.detailCard}>
          <View style={styles.detailCardHeading}>
            <View style={styles.detailIcon}>
              <Feather name="credit-card" size={15} color={colors.primary} />
            </View>
            <Text style={styles.detailCardTitle}>Payment information</Text>
          </View>
          <PaymentDetail title="Payment method" value={paymentMethod} />
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
        </Card>
        {booking ? (
          <Card style={styles.detailCard}>
            <View style={styles.detailCardHeading}>
              <View style={styles.detailIcon}>
                <Feather name="calendar" size={15} color={colors.primary} />
              </View>
              <Text style={styles.detailCardTitle}>Booking details</Text>
            </View>
            <PaymentDetail
              title="Service"
              value={booking.serviceNameSnapshot || 'Individual booking'}
            />
            <PaymentDetail
              title="Scheduled"
              value={`${new Date(booking.bookingDate).toLocaleDateString()} · ${
                booking.bookingTime
              }`}
            />
            <PaymentDetail title="Booking status" value={booking.status} />
            <PaymentDetail
              title="Payment type"
              value={booking.paymentType || 'Individual'}
            />
          </Card>
        ) : membership ? (
          <Card style={styles.detailCard}>
            <View style={styles.detailCardHeading}>
              <View style={styles.detailIcon}>
                <Feather name="award" size={15} color={colors.primary} />
              </View>
              <Text style={styles.detailCardTitle}>Membership details</Text>
            </View>
            <PaymentDetail
              title="Validity"
              value={`${new Date(
                membership.startDate,
              ).toLocaleDateString()} – ${new Date(
                membership.endDate,
              ).toLocaleDateString()}`}
            />
            <PaymentDetail
              title="Membership status"
              value={membership.status}
            />
          </Card>
        ) : null}
        {transaction.provider === 'Cash' &&
        transaction.status === 'Paid' &&
        booking?._id ? (
          <ActionButton
            title={
              receiptDisabled ? 'Preparing receipt...' : 'Download cash receipt'
            }
            onPress={() => onReceipt(booking._id)}
            disabled={receiptDisabled}
            variant="secondary"
          />
        ) : null}
      </DetailsSheet>
    </>
  );
};

const PaymentDetail = ({ title, value }: { title: string; value?: string }) => (
  <View style={styles.paymentDetail}>
    <Text style={styles.paymentDetailLabel}>{title}</Text>
    <Text style={styles.paymentDetailValue}>{value || '—'}</Text>
  </View>
);

const CustomerPaymentHistoryScreen = () => {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState<ProviderFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [draftProvider, setDraftProvider] = useState<ProviderFilter>(provider);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, isError, refetch } =
    useGetMyPaymentTransactionsQuery({
      page,
      limit: 20,
      ...(provider ? { provider } : {}),
      ...(status ? { status } : {}),
    });
  const [createReceiptLink, receiptState] = useCreateCashReceiptLinkMutation();
  const transactions = data?.data ?? [];
  const summary = data?.meta?.summary;
  const totalPages = Math.max(1, data?.meta?.totalPages ?? 1);
  const visibleTransactions = transactions.filter(transaction => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const booking = transaction.bookingId;
    const membership = transaction.membershipId;
    return [
      transaction.amount,
      transaction.provider,
      transaction.status,
      transaction.reference,
      transaction.recordedByWorker?.name,
      booking?.serviceNameSnapshot,
      booking?.bookingDate,
      booking?.bookingTime,
      booking?.status,
      booking?.paymentType,
      membership ? 'Membership purchase' : '',
      membership?.startDate,
      membership?.endDate,
      membership?.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term);
  });

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
      const response = error as { data?: { message?: string } };
      Alert.alert(
        'Receipt unavailable',
        response.data?.message || 'Could not open the cash receipt PDF.',
      );
    }
  };

  return (
    <Page
      listData={isLoading || isError ? [] : visibleTransactions}
      listKeyExtractor={transaction => transaction._id}
      renderListItem={({ item }) => (
        <PaymentRow
          transaction={item}
          onReceipt={openReceipt}
          receiptDisabled={receiptState.isLoading}
        />
      )}
      listFooter={
        transactions.length ? (
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
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Feather name="pie-chart" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryTotalGroup}>
            <Text style={styles.summaryTitle}>Payment summary</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(summary?.paidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryPaidBadge}>
            <Feather name="check-circle" size={12} color={colors.success} />
            <Text style={styles.summaryPaidText}>TOTAL PAID</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryGrid}>
          <SummaryStat
            icon="credit-card"
            label="Online paid"
            value={summary?.onlinePaidAmount ?? 0}
          />
          <SummaryStat
            icon="dollar-sign"
            label="Cash paid"
            value={summary?.cashPaidAmount ?? 0}
          />
          <SummaryStat
            icon="clock"
            label="Pending"
            value={summary?.pendingAmount ?? 0}
          />
        </View>
      </Card>

      <View style={styles.transactionHeading}>
        <Text style={styles.transactionHeadingTitle}>Transactions</Text>
        <Text style={styles.transactionHeadingSubtitle}>
          Payments and membership activity
        </Text>
      </View>
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search transactions"
        filterAccessibilityLabel="Filter payment history"
        hasActiveFilters={Boolean(provider || status)}
        onFilterPress={() => {
          setDraftProvider(provider);
          setDraftStatus(status);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {providerFilters.find(item => item.value === provider)?.label ||
              'All methods'}
          </Text>
        </View>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {statusFilters.find(item => item.value === status)?.label ||
              'All statuses'}
          </Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter payment history"
        subtitle="Choose payment method and transaction status"
        groups={[
          {
            key: 'provider',
            title: 'Payment method',
            value: draftProvider,
            defaultValue: '',
            options: providerFilters,
            onChange: value =>
              setDraftProvider(
                providerFilters.find(item => item.value === value)?.value || '',
              ),
          },
          {
            key: 'status',
            title: 'Payment status',
            value: draftStatus,
            defaultValue: '',
            options: statusFilters,
            onChange: value =>
              setDraftStatus(
                statusFilters.find(item => item.value === value)?.value || '',
              ),
          },
        ]}
        onApply={() => {
          chooseProvider(draftProvider);
          chooseStatus(draftStatus);
        }}
      />

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : isError ? (
        <InfoMessage
          text="Payment history could not be loaded. Refresh and try again."
          variant="error"
        />
      ) : visibleTransactions.length ? null : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather
              name={
                provider || status || search.trim() ? 'filter' : 'credit-card'
              }
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {provider || status || search.trim()
              ? 'No matching transactions'
              : 'No payments yet'}
          </Text>
          <Text style={styles.emptyCopy}>
            {provider || status || search.trim()
              ? 'Try another search, payment method, or status filter.'
              : 'Your booking and membership payments will appear here.'}
          </Text>
        </Card>
      )}
    </Page>
  );
};

const styles = StyleSheet.create({
  summaryCard: { gap: 14, borderRadius: 18, paddingVertical: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  summaryIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  summaryTotalGroup: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: colors.muted },
  summaryValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  summaryPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#E8F5EE',
  },
  summaryPaidText: { fontSize: 9, fontWeight: '900', color: colors.success },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryStat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 5,
  },
  summaryStatIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.canvas,
  },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  summaryStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  transactionHeading: { flex: 1, gap: 2 },
  transactionHeadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  transactionHeadingSubtitle: { fontSize: 11, color: colors.muted },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  activeFilterLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  activeFilterChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  activeFilterText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  transactionCard: { gap: 10, borderRadius: 17, paddingVertical: 14 },
  transactionDetailsTap: { gap: 11 },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  amountCopy: { flex: 1, gap: 2 },
  amountLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.muted,
  },
  transactionCopy: { gap: 3 },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  amountGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  providerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  amount: { fontSize: 19, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.canvas,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  paid: { backgroundColor: '#E8F5EE' },
  failed: { backgroundColor: '#FDECEA' },
  pending: { backgroundColor: '#FFF4E5' },
  refunded: { backgroundColor: '#F4EBFF' },
  unknownStatus: { backgroundColor: colors.canvas },
  paidText: { color: colors.success },
  failedText: { color: colors.danger },
  pendingText: { color: '#A15C00' },
  refundedText: { color: '#6941C6' },
  unknownStatusText: { color: colors.muted },
  paymentHero: { gap: 10, borderRadius: 18, padding: 16 },
  paymentHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  providerIconLarge: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.paleBlue,
  },
  paymentHeroAmount: { fontSize: 27, fontWeight: '900', color: colors.ink },
  detailCard: { gap: 7, borderRadius: 17 },
  detailCardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 2,
  },
  detailIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  detailCardTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  paymentDetail: {
    gap: 3,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paymentDetailLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  paymentDetailValue: { fontSize: 14, lineHeight: 20, color: colors.ink },
  transactionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  copy: { fontSize: 12, lineHeight: 18, color: colors.muted },
  method: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
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
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateMetaItem: { flex: 1, justifyContent: 'flex-end' },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  receiptText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  disabled: { opacity: 0.5 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageButton: { flex: 1 },
  pageText: { fontSize: 12, color: colors.muted },
  emptyCard: { alignItems: 'flex-start', gap: 10, borderRadius: 18 },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  emptyCopy: { fontSize: 13, lineHeight: 19, color: colors.muted },
});

export default CustomerPaymentHistoryScreen;

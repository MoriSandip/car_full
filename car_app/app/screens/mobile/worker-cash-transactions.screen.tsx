import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  DetailsSheet,
  FilterBottomSheet,
  InfoMessage,
  ListItemPressable,
  LoadingSkeleton,
  Page,
  SearchFilterBar,
} from '../../components/mobile/ui';
import {
  useGetMyCashTransactionsQuery,
  WorkerCashTransaction,
} from '../../store/worker.api';

type StatusFilter = '' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';
const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Received', value: 'Paid' },
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
    : date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const transactionStatusLabel = (status: string) =>
  status === 'Paid' ? 'Received' : status;

const transactionStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid':
      return 'check-circle';
    case 'Pending':
      return 'clock';
    case 'Failed':
      return 'x-circle';
    case 'Refunded':
      return 'corner-up-left';
    default:
      return 'help-circle';
  }
};

const transactionStatusColor = (status: string) => {
  switch (status) {
    case 'Paid':
      return colors.success;
    case 'Pending':
      return '#A15C00';
    case 'Failed':
      return colors.danger;
    case 'Refunded':
      return '#6941C6';
    default:
      return colors.muted;
  }
};

const WorkerCashTransactionsScreen = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] =
    useState<WorkerCashTransaction | null>(null);
  const { data, isLoading, isFetching, isError, refetch } =
    useGetMyCashTransactionsQuery({
      page,
      limit: 20,
      ...(status ? { status } : {}),
    });
  const transactions = useMemo(() => data?.data ?? [], [data?.data]);
  const visibleTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter(transaction =>
      [
        formatMoney(transaction.amount),
        transaction.status,
        transaction.reference,
        transaction.customerId?.name,
        transaction.customerId?.phone,
        transaction.customerId?.email,
        transaction.bookingId?.serviceNameSnapshot,
        transaction.bookingId?.bookingDate,
        transaction.bookingId?.bookingTime,
        transaction.bookingId?.status,
        transaction.bookingId?.carId?.registrationNumber,
        transaction.bookingId?.carId?.make,
        transaction.bookingId?.carId?.model,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [search, transactions]);
  const summary = data?.meta?.summary;
  const totalPages = Math.max(1, data?.meta?.totalPages ?? 1);

  return (
    <Page
      listData={isLoading || isError ? [] : visibleTransactions}
      listKeyExtractor={transaction => transaction._id}
      renderListItem={({ item }) => (
        <CashTransactionRow
          transaction={item}
          onPress={() => setSelectedTransaction(item)}
        />
      )}
      listFooter={
        transactions.length && !isLoading && !isError ? (
          <View style={styles.pagination}>
            <ActionButton
              title="Previous"
              variant="secondary"
              disabled={page <= 1 || isFetching}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              style={styles.pageButton}
            />
            <Text style={styles.pageText}>
              {page} / {totalPages}
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
          onRefresh={async () => {
            await refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.summary}>
        <SummaryValue
          icon="dollar-sign"
          label="Cash received"
          value={formatMoney(summary?.paidAmount ?? 0)}
        />
        <SummaryValue
          icon="check-circle"
          label="Transactions"
          value={String(summary?.transactionCount ?? 0)}
        />
        <SummaryValue
          icon="rotate-ccw"
          label="Refunded"
          value={formatMoney(summary?.refundedAmount ?? 0)}
        />
      </View>
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search cash transactions"
        filterAccessibilityLabel={`Filter cash transactions, currently ${
          statusFilters.find(filter => filter.value === status)?.label || 'All'
        }`}
        hasActiveFilters={Boolean(status)}
        onFilterPress={() => {
          setDraftStatus(status);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {statusFilters.find(filter => filter.value === status)?.label ||
              'All'}
          </Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter transactions"
        subtitle="Choose which cash transaction statuses to show"
        groups={[
          {
            key: 'status',
            title: 'Transaction status',
            value: draftStatus,
            defaultValue: '',
            options: statusFilters,
            onChange: value =>
              setDraftStatus(
                statusFilters.find(filter => filter.value === value)?.value ||
                  '',
              ),
          },
        ]}
        onApply={() => {
          setStatus(draftStatus);
          setPage(1);
        }}
      />

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : isError ? (
        <InfoMessage
          text="Cash transactions could not be loaded. Pull down to retry."
          variant="error"
        />
      ) : visibleTransactions.length ? null : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather
              name={search.trim() || status ? 'search' : 'dollar-sign'}
              size={19}
              color={colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {search.trim() || status
              ? 'No matching transactions'
              : 'No cash transactions yet'}
          </Text>
          <Text style={styles.copy}>
            {search.trim() || status
              ? 'Try another search or transaction status filter.'
              : 'Cash collections recorded for your assigned bookings will appear here.'}
          </Text>
        </Card>
      )}

      <DetailsSheet
        visible={Boolean(selectedTransaction)}
        setVisible={visible => !visible && setSelectedTransaction(null)}
        title="Cash transaction details"
      >
        {selectedTransaction ? (
          <>
            <Card style={styles.detailHero}>
              <View style={styles.detailHeroHeader}>
                <View style={styles.detailHeroIcon}>
                  <Feather
                    name="dollar-sign"
                    size={21}
                    color={colors.primary}
                  />
                </View>
                <TransactionStatusPill
                  status={selectedTransaction.status}
                />
              </View>
              <Text style={styles.detailHeroAmount}>
                {formatMoney(selectedTransaction.amount)}
              </Text>
              <Text style={styles.detailHeroTitle} numberOfLines={2}>
                {selectedTransaction.bookingId?.serviceNameSnapshot ||
                  'Cash payment'}
              </Text>
              <Text style={styles.detailHeroCopy}>
                Cash collection ·{' '}
                {formatDateTime(selectedTransaction.createdAt)}
              </Text>
            </Card>
            <Card style={styles.detailCard}>
              <DetailCardHeading icon="credit-card" title="Payment details" />
              <TransactionDetail
                title="Recorded on"
                value={formatDateTime(selectedTransaction.createdAt)}
              />
              {selectedTransaction.verifiedAt ? (
                <TransactionDetail
                  title="Verified on"
                  value={formatDateTime(selectedTransaction.verifiedAt)}
                />
              ) : null}
              {selectedTransaction.reference ? (
                <TransactionDetail
                  title="Reference"
                  value={selectedTransaction.reference}
                />
              ) : null}
              {selectedTransaction.recordedByWorker?.name ||
              selectedTransaction.recordedBy?.name ? (
                <TransactionDetail
                  title="Recorded by"
                  value={
                    selectedTransaction.recordedByWorker?.name ||
                    selectedTransaction.recordedBy?.name
                  }
                />
              ) : null}
            </Card>
            {selectedTransaction.status === 'Refunded' ? (
              <Card style={styles.detailCard}>
                <DetailCardHeading icon="rotate-ccw" title="Refund details" />
                {selectedTransaction.refundedAt ? (
                  <TransactionDetail
                    title="Refunded on"
                    value={formatDateTime(selectedTransaction.refundedAt)}
                  />
                ) : null}
                {selectedTransaction.refundReference ? (
                  <TransactionDetail
                    title="Refund reference"
                    value={selectedTransaction.refundReference}
                  />
                ) : null}
                {selectedTransaction.refundReason ? (
                  <TransactionDetail
                    title="Refund reason"
                    value={selectedTransaction.refundReason}
                  />
                ) : null}
              </Card>
            ) : null}
            {selectedTransaction.bookingId ? (
              <Card style={styles.detailCard}>
                <DetailCardHeading icon="calendar" title="Booking details" />
                <TransactionDetail
                  title="Service"
                  value={
                    selectedTransaction.bookingId.serviceNameSnapshot ||
                    'Car wash'
                  }
                />
                <TransactionDetail
                  title="Vehicle"
                  value={
                    [
                      selectedTransaction.bookingId.carId?.registrationNumber,
                      selectedTransaction.bookingId.carId?.make,
                      selectedTransaction.bookingId.carId?.model,
                    ]
                      .filter(Boolean)
                      .join(' ') || '—'
                  }
                />
                <TransactionDetail
                  title="Booking status"
                  value={selectedTransaction.bookingId.status}
                />
                <TransactionDetail
                  title="Scheduled for"
                  value={`${formatDate(
                    selectedTransaction.bookingId.bookingDate,
                  )} · ${selectedTransaction.bookingId.bookingTime}`}
                />
                <TransactionDetail
                  title="Customer"
                  value={selectedTransaction.customerId?.name}
                />
                <TransactionDetail
                  title="Contact"
                  value={
                    selectedTransaction.customerId?.phone ||
                    selectedTransaction.customerId?.email
                  }
                />
              </Card>
            ) : null}
          </>
        ) : null}
      </DetailsSheet>
    </Page>
  );
};

const CashTransactionRow = ({
  transaction,
  onPress,
}: {
  transaction: WorkerCashTransaction;
  onPress: () => void;
}) => {
  const vehicle = [
    transaction.bookingId?.carId?.registrationNumber,
    transaction.bookingId?.carId?.make,
    transaction.bookingId?.carId?.model,
  ]
    .filter(Boolean)
    .join(' ');
  const title = transaction.bookingId?.serviceNameSnapshot || 'Cash payment';
  return (
    <Card style={styles.transactionCard}>
      <ListItemPressable
        accessibilityLabel={`View ${formatMoney(
          transaction.amount,
        )} cash transaction details`}
        onPress={onPress}
        style={styles.transactionDetailsTap}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.amountGroup}>
            <View style={styles.cashIcon}>
              <Feather name="dollar-sign" size={19} color={colors.primary} />
            </View>
            <View style={styles.amountCopy}>
              <Text style={styles.amountLabel}>TRANSACTION AMOUNT</Text>
              <Text style={styles.amount} numberOfLines={1}>
                {formatMoney(transaction.amount)}
              </Text>
            </View>
          </View>
          <TransactionStatusPill status={transaction.status} />
        </View>
        <Text style={styles.transactionTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.transactionMetaRow}>
          <TransactionMeta
            icon="user"
            value={transaction.customerId?.name || 'Customer'}
          />
          <TransactionMeta
            icon="clock"
            value={formatDateTime(transaction.createdAt)}
          />
        </View>
        {vehicle ? (
          <TransactionMeta icon="truck" value={vehicle} />
        ) : null}
        {transaction.recordedByWorker?.name || transaction.recordedBy?.name ? (
          <TransactionMeta
            icon="user-check"
            value={`Recorded by ${
              transaction.recordedByWorker?.name ||
              transaction.recordedBy?.name
            }`}
          />
        ) : null}
        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>View full details</Text>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </View>
      </ListItemPressable>
    </Card>
  );
};

const TransactionStatusPill = ({status}: {status: string}) => (
  <View
    style={[
      styles.statusPill,
      status === 'Paid' && styles.statusPaid,
      status === 'Pending' && styles.statusPending,
      status === 'Failed' && styles.statusFailed,
      status === 'Refunded' && styles.statusRefunded,
    ]}
  >
    <Feather
      name={transactionStatusIcon(status)}
      size={12}
      color={transactionStatusColor(status)}
    />
    <Text
      style={[
        styles.statusText,
        status === 'Paid' && styles.statusPaidText,
        status === 'Pending' && styles.statusPendingText,
        status === 'Failed' && styles.statusFailedText,
        status === 'Refunded' && styles.statusRefundedText,
      ]}
    >
      {transactionStatusLabel(status)}
    </Text>
  </View>
);

const TransactionMeta = ({icon, value}: {icon: string; value: string}) => (
  <View style={styles.transactionMeta}>
    <Feather name={icon} size={13} color={colors.muted} />
    <Text style={styles.transactionMetaText} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const DetailCardHeading = ({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) => (
  <View style={styles.detailCardHeading}>
    <View style={styles.detailIcon}>
      <Feather name={icon} size={15} color={colors.primary} />
    </View>
    <Text style={styles.detailCardTitle}>{title}</Text>
  </View>
);

const SummaryValue = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <Card style={styles.summaryCard}>
    <View style={styles.summaryIcon}>
      <Feather name={icon} size={14} color={colors.primary} />
    </View>
    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.summaryLabel} numberOfLines={1}>
      {label}
    </Text>
  </Card>
);

const TransactionDetail = ({
  title,
  value,
}: {
  title: string;
  value?: string;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 7 },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 9,
    borderRadius: 13,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.paleBlue,
  },
  summaryValue: { fontSize: 13, fontWeight: '800', color: colors.ink },
  summaryLabel: { fontSize: 9, fontWeight: '600', color: colors.muted },
  activeFilters: { flexDirection: 'row', alignItems: 'center', gap: 7 },
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
  transactionCard: { borderRadius: 17, paddingVertical: 12 },
  transactionDetailsTap: { gap: 10 },
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
  amountCopy: { flex: 1, minWidth: 0, gap: 2 },
  amountLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.muted,
  },
  cashIcon: {
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
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: colors.canvas,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusPaid: { backgroundColor: '#E8F5EE' },
  statusPending: { backgroundColor: '#FFF4E5' },
  statusFailed: { backgroundColor: '#FDECEA' },
  statusRefunded: { backgroundColor: '#F4EBFF' },
  statusPaidText: { color: colors.success },
  statusPendingText: { color: '#A15C00' },
  statusFailedText: { color: colors.danger },
  statusRefundedText: { color: '#6941C6' },
  transactionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  copy: { fontSize: 12, lineHeight: 17, color: colors.muted },
  transactionMetaRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  transactionMetaText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  viewDetails: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageButton: { flex: 1 },
  pageText: { fontSize: 12, color: colors.muted },
  emptyCard: { alignItems: 'flex-start', gap: 9, borderRadius: 15 },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  detailHero: { gap: 9, borderRadius: 18, padding: 16 },
  detailHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailHeroIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.paleBlue,
  },
  detailHeroAmount: { fontSize: 27, fontWeight: '900', color: colors.ink },
  detailHeroTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  detailHeroCopy: { fontSize: 12, lineHeight: 18, color: colors.muted },
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
  detailRow: {
    gap: 3,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    fontWeight: '600',
  },
});

export default WorkerCashTransactionsScreen;

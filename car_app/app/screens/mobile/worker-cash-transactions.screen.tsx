import React, {useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
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
  ListItemPressable,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {
  useGetMyCashTransactionsQuery,
  WorkerCashTransaction,
} from '../../store/worker.api';

type StatusFilter = '' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';
const statusFilters: {label: string; value: StatusFilter}[] = [
  {label: 'All', value: ''},
  {label: 'Received', value: 'Paid'},
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

const WorkerCashTransactionsScreen = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('');
  const [selectedTransaction, setSelectedTransaction] =
    useState<WorkerCashTransaction | null>(null);
  const {data, isLoading, isFetching, isError, refetch} =
    useGetMyCashTransactionsQuery({
      page,
      limit: 20,
      ...(status ? {status} : {}),
    });
  const transactions = useMemo(() => data?.data ?? [], [data?.data]);
  const summary = data?.meta?.summary;
  const totalPages = Math.max(1, data?.meta?.totalPages ?? 1);

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={async () => {
            await refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <PageTitle
        compact
        title="Cash transactions"
        subtitle="Cash payments you recorded for completed bookings."
      />
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        {statusFilters.map(filter => (
          <Pressable
            key={filter.value || 'all'}
            accessibilityRole="button"
            accessibilityState={{selected: status === filter.value}}
            onPress={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            style={[
              styles.filter,
              status === filter.value && styles.filterSelected,
            ]}>
            <Text
              style={[
                styles.filterText,
                status === filter.value && styles.filterTextSelected,
              ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingMessage text="Loading cash transactions..." />
      ) : isError ? (
        <InfoMessage
          text="Cash transactions could not be loaded. Pull down to retry."
          variant="error"
        />
      ) : transactions.length ? (
        <View style={styles.list}>
          {transactions.map(transaction => (
            <CashTransactionRow
              key={transaction._id}
              transaction={transaction}
              onPress={() => setSelectedTransaction(transaction)}
            />
          ))}
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
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="dollar-sign" size={19} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No cash transactions yet</Text>
          <Text style={styles.copy}>
            Cash payments you report while completing a job will appear here.
          </Text>
        </Card>
      )}

      <DetailsSheet
        visible={Boolean(selectedTransaction)}
        setVisible={visible => !visible && setSelectedTransaction(null)}
        title="Cash transaction details">
        {selectedTransaction ? (
          <>
            <View style={styles.detailAmount}>
              <Text style={styles.detailAmountLabel}>Amount</Text>
              <Text style={styles.detailAmountValue}>
                {formatMoney(selectedTransaction.amount)}
              </Text>
            </View>
            <TransactionDetail
              title="Payment status"
              value={selectedTransaction.status}
            />
            <TransactionDetail
              title="Recorded on"
              value={formatDateTime(selectedTransaction.createdAt)}
            />
            <TransactionDetail
              title="Verified on"
              value={formatDateTime(selectedTransaction.verifiedAt)}
            />
            <TransactionDetail
              title="Reference"
              value={selectedTransaction.reference}
            />
            {selectedTransaction.status === 'Refunded' ? (
              <>
                <TransactionDetail
                  title="Refunded on"
                  value={formatDateTime(selectedTransaction.refundedAt)}
                />
                <TransactionDetail
                  title="Refund reference"
                  value={selectedTransaction.refundReference}
                />
                <TransactionDetail
                  title="Refund reason"
                  value={selectedTransaction.refundReason}
                />
              </>
            ) : null}
            {selectedTransaction.bookingId ? (
              <>
                <Text style={styles.sectionTitle}>Booking</Text>
                <TransactionDetail
                  title="Service"
                  value={
                    selectedTransaction.bookingId.serviceNameSnapshot ||
                    'Car wash'
                  }
                />
                <TransactionDetail
                  title="Vehicle"
                  value={[
                    selectedTransaction.bookingId.carId?.registrationNumber,
                    selectedTransaction.bookingId.carId?.make,
                    selectedTransaction.bookingId.carId?.model,
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'}
                />
                <TransactionDetail
                  title="Scheduled"
                  value={`${formatDate(selectedTransaction.bookingId.bookingDate)} · ${selectedTransaction.bookingId.bookingTime}`}
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
                <TransactionDetail
                  title="Booking status"
                  value={selectedTransaction.bookingId.status}
                />
              </>
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
  const title =
    transaction.bookingId?.serviceNameSnapshot || 'Cash payment';
  return (
    <ListItemPressable
      accessibilityLabel={`View ${formatMoney(transaction.amount)} cash transaction details`}
      onPress={onPress}>
      <Card style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.amountGroup}>
            <View style={styles.cashIcon}>
              <Feather name="dollar-sign" size={16} color={colors.primary} />
            </View>
            <Text style={styles.amount} numberOfLines={1}>
              {formatMoney(transaction.amount)}
            </Text>
          </View>
          <Text
            style={[
              styles.status,
              transaction.status === 'Paid' && styles.statusPaid,
              transaction.status === 'Pending' && styles.statusPending,
              transaction.status === 'Failed' && styles.statusFailed,
              transaction.status === 'Refunded' && styles.statusRefunded,
            ]}
            numberOfLines={1}>
            {transaction.status}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.copy} numberOfLines={1}>
          {transaction.customerId?.name || 'Customer'} ·{' '}
          {formatDateTime(transaction.createdAt)}
        </Text>
        {vehicle ? (
          <Text style={styles.copy} numberOfLines={1}>
            {vehicle}
          </Text>
        ) : null}
        <View style={styles.rowFooter}>
          <Text style={styles.rowFooterText}>View transaction details</Text>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </View>
      </Card>
    </ListItemPressable>
  );
};

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
  summary: {flexDirection: 'row', gap: 7},
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
  summaryValue: {fontSize: 13, fontWeight: '800', color: colors.ink},
  summaryLabel: {fontSize: 9, fontWeight: '600', color: colors.muted},
  filters: {flexDirection: 'row', gap: 7, paddingRight: 4},
  filter: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  filterSelected: {backgroundColor: colors.paleBlue, borderColor: colors.primary},
  filterText: {fontSize: 12, fontWeight: '600', color: colors.muted},
  filterTextSelected: {color: colors.primaryDark},
  list: {gap: 9},
  transactionCard: {gap: 7, borderRadius: 14, paddingVertical: 11},
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  amountGroup: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8},
  cashIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  amount: {fontSize: 16, fontWeight: '900', color: colors.ink, flexShrink: 1},
  status: {
    overflow: 'hidden',
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: colors.canvas,
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
  },
  statusPaid: {color: colors.success, backgroundColor: '#E8F5EE'},
  statusPending: {color: '#A15C00', backgroundColor: '#FFF4E5'},
  statusFailed: {color: colors.danger, backgroundColor: '#FDECEA'},
  statusRefunded: {color: '#6941C6', backgroundColor: '#F4EBFF'},
  title: {fontSize: 14, fontWeight: '700', color: colors.ink},
  copy: {fontSize: 12, lineHeight: 17, color: colors.muted},
  rowFooter: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  rowFooterText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageButton: {flex: 1},
  pageText: {fontSize: 12, color: colors.muted},
  emptyCard: {alignItems: 'flex-start', gap: 9, borderRadius: 15},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  emptyTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  detailAmount: {
    alignItems: 'center',
    gap: 3,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  detailAmountLabel: {fontSize: 11, fontWeight: '600', color: colors.muted},
  detailAmountValue: {fontSize: 24, fontWeight: '900', color: colors.primaryDark},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: colors.ink,
    fontWeight: '600',
  },
  sectionTitle: {fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 4},
});

export default WorkerCashTransactionsScreen;

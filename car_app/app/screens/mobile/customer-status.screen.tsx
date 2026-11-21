import React, { useMemo, useState } from 'react';
import { Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
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
import { useGetMyBookingsQuery } from '../../store/customer.api';
import { Booking, RelatedEntity } from '../../store/types';

const labelOf = (value: RelatedEntity) =>
  typeof value === 'string'
    ? value
    : value?.registrationNumber ?? value?.name ?? '—';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const formatTimestamp = (value?: string | null) => {
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
        second: '2-digit',
      });
};

const formatDuration = (value?: number) => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map(part => String(part).padStart(2, '0'))
    .join(':');
};

const workStatus = (booking: Booking) => {
  if (booking.workStatus === 'Working') return 'In progress';
  if (booking.workStatus === 'Paused') return 'Paused';
  if (booking.workStatus === 'Completed' || booking.status === 'Completed') {
    return 'Completed';
  }
  if (booking.status === 'Cancelled') return 'Cancelled';
  return 'Not started';
};

const statusBadgeColor = (booking: Booking) => {
  switch (workStatus(booking)) {
    case 'In progress':
      return styles.inProgressBadge;
    case 'Paused':
      return styles.pausedBadge;
    case 'Completed':
      return styles.completedBadge;
    case 'Cancelled':
      return styles.cancelledBadge;
    default:
      return styles.notStartedBadge;
  }
};

const statusTextColor = (booking: Booking) => {
  switch (workStatus(booking)) {
    case 'In progress':
      return styles.inProgressText;
    case 'Paused':
      return styles.pausedText;
    case 'Completed':
      return styles.completedText;
    case 'Cancelled':
      return styles.cancelledText;
    default:
      return styles.notStartedText;
  }
};

const statusOptions = [
  { label: 'All tasks', value: 'All' },
  { label: 'Not started', value: 'Not started' },
  { label: 'In progress', value: 'In progress' },
  { label: 'Paused', value: 'Paused' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const checklistItems: {
  label: string;
  key: keyof NonNullable<Booking['cleaningChecklist']>;
}[] = [
  { label: 'Exterior wash', key: 'exteriorWash' },
  { label: 'Interior cleaning', key: 'interiorCleaning' },
  { label: 'Dashboard', key: 'dashboard' },
  { label: 'Tyre dressing', key: 'tyreDressing' },
  { label: 'Vacuum cleaning', key: 'vacuumCleaning' },
];

const CustomerStatusScreen = () => {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetMyBookingsQuery(undefined, { pollingInterval: 30_000 });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState('All');
  const [draftStatus, setDraftStatus] = useState(status);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const bookings = useMemo(() => data?.data ?? [], [data?.data]);
  const visibleBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter(booking => {
      if (status !== 'All' && workStatus(booking) !== status) return false;
      if (!term) return true;
      const searchableText = [
        booking.serviceNameSnapshot,
        labelOf(booking.carId),
        labelOf(booking.societyId),
        labelOf(booking.flatId),
        booking.bookingDate,
        booking.bookingTime,
        booking.status,
        booking.workStatus,
        booking.paymentStatus,
        booking.amountPayable,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(term);
    });
  }, [bookings, search, status]);
  const activeFilterLabel =
    statusOptions.find(option => option.value === status)?.label ?? status;
  const activeCount = bookings.filter(
    booking =>
      ['Working', 'Paused'].includes(booking.workStatus || '') ||
      booking.status === 'InProgress',
  ).length;
  const completedCount = bookings.filter(
    booking =>
      booking.status === 'Completed' || booking.workStatus === 'Completed',
  ).length;

  return (
    <Page
      listData={isLoading || isError ? [] : visibleBookings}
      listKeyExtractor={booking => booking._id}
      renderListItem={({ item: booking }) => (
        <ListItemPressable
          accessibilityLabel={`View ${
            booking.serviceNameSnapshot || 'cleaning task'
          } details`}
          onPress={() => setSelectedBooking(booking)}
        >
          <Card style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={styles.bookingIcon}>
                <Feather name="droplet" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {booking.serviceNameSnapshot || 'Car wash'}
                </Text>
                <Text style={styles.body} numberOfLines={1}>
                  {labelOf(booking.carId)}
                </Text>
              </View>
              <View style={[styles.statusBadge, statusBadgeColor(booking)]}>
                <Text
                  style={[styles.statusBadgeText, statusTextColor(booking)]}
                  numberOfLines={1}
                >
                  {workStatus(booking)}
                </Text>
              </View>
            </View>
            <View style={styles.bookingMetaRow}>
              <View style={styles.bookingMetaIcon}>
                <Feather name="calendar" size={14} color={colors.primary} />
              </View>
              <View style={styles.bookingMetaCopy}>
                <Text style={styles.bookingMetaLabel}>SCHEDULED</Text>
                <Text style={styles.bookingMetaValue} numberOfLines={1}>
                  {formatDate(booking.bookingDate)} · {booking.bookingTime}
                </Text>
              </View>
            </View>
            <View style={styles.bookingFooter}>
              <View style={styles.bookingAmountGroup}>
                <Text style={styles.bookingMetaLabel}>BOOKING TOTAL</Text>
                <Text style={styles.bookingAmount} numberOfLines={1}>
                  ₹
                  {Number(booking.amountPayable || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <Text style={styles.paymentStatus} numberOfLines={1}>
                {booking.paymentStatus || 'Payment pending'}
              </Text>
            </View>
            <View style={styles.detailButton}>
              <Text style={styles.detailButtonText}>
                View cleaning progress
              </Text>
              <Feather name="chevron-right" size={17} color={colors.primary} />
            </View>
          </Card>
        </ListItemPressable>
      )}
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
      <View style={styles.stats}>
        <StatusStat
          icon="layers"
          value={isLoading ? '—' : String(bookings.length)}
          label="Wash tasks"
        />
        <StatusStat
          icon="clock"
          value={isLoading ? '—' : String(activeCount)}
          label="In progress"
        />
        <StatusStat
          icon="check-circle"
          value={isLoading ? '—' : String(completedCount)}
          label="Completed"
        />
      </View>
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search cleaning tasks"
        filterAccessibilityLabel={`Filter cleaning status, currently ${activeFilterLabel}`}
        hasActiveFilters={status !== 'All'}
        onFilterPress={() => {
          setDraftStatus(status);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>{activeFilterLabel}</Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter cleaning status"
        subtitle="Choose which work progress to show"
        groups={[
          {
            key: 'workStatus',
            title: 'Work status',
            value: draftStatus,
            defaultValue: 'All',
            options: statusOptions,
            onChange: setDraftStatus,
          },
        ]}
        onApply={() => setStatus(draftStatus)}
      />
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : isError ? (
        <InfoMessage
          text="Cleaning status could not be loaded. Please retry."
          variant="error"
        />
      ) : bookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="activity" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>No wash tasks yet</Text>
          <Text style={styles.body}>
            Worker progress and cleaning history will appear here after you book
            a wash.
          </Text>
        </Card>
      ) : visibleBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="filter" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>No matching wash tasks</Text>
          <Text style={styles.body}>
            {search.trim()
              ? 'Try another service, vehicle, date, or status search.'
              : 'Try another work status or reset the filter to see all tasks.'}
          </Text>
        </Card>
      ) : null}

      <DetailsSheet
        visible={Boolean(selectedBooking)}
        setVisible={visible => !visible && setSelectedBooking(null)}
        title="Cleaning task details"
      >
        {selectedBooking ? (
          <>
            <View style={styles.detailsHero}>
              <View style={styles.detailsHeroHeader}>
                <View style={styles.bookingIcon}>
                  <Feather name="droplet" size={20} color={colors.primary} />
                </View>
                <View style={styles.detailsHeroCopy}>
                  <Text style={styles.detailsHeroTitle} numberOfLines={2}>
                    {selectedBooking.serviceNameSnapshot || 'Car wash'}
                  </Text>
                  <Text style={styles.body} numberOfLines={1}>
                    {labelOf(selectedBooking.carId)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    statusBadgeColor(selectedBooking),
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      statusTextColor(selectedBooking),
                    ]}
                    numberOfLines={1}
                  >
                    {workStatus(selectedBooking)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsHeroDivider} />
              <View style={styles.detailsHeroFooter}>
                <View style={styles.detailsHeroMetric}>
                  <Text style={styles.detailsHeroLabel}>SCHEDULED</Text>
                  <Text style={styles.detailsHeroValue}>
                    {formatDate(selectedBooking.bookingDate)} ·{' '}
                    {selectedBooking.bookingTime}
                  </Text>
                </View>
                <View style={styles.detailsHeroMetric}>
                  <Text style={styles.detailsHeroLabel}>BOOKING TOTAL</Text>
                  <Text style={styles.detailsHeroValue}>
                    ₹
                    {Number(selectedBooking.amountPayable || 0).toLocaleString(
                      'en-IN',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <View style={styles.sectionHeading}>
                <Feather name="credit-card" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Booking & payment</Text>
              </View>
              <Detail title="Booking status" value={selectedBooking.status} />
              <Detail title="Work status" value={workStatus(selectedBooking)} />
              <Detail
                title="Payment"
                value={`${selectedBooking.paymentType} · ${selectedBooking.paymentStatus}`}
              />
              <Detail
                title="Amount"
                value={`₹${Number(selectedBooking.amountPayable || 0).toFixed(
                  2,
                )}`}
              />
            </View>

            {typeof selectedBooking.carId !== 'string' ? (
              <View style={styles.detailSection}>
                <View style={styles.sectionHeading}>
                  <Feather name="truck" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Vehicle details</Text>
                </View>
                {selectedBooking.carId.imageUrl ? (
                  <Image
                    source={{ uri: selectedBooking.carId.imageUrl }}
                    style={styles.detailCarImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Detail
                  title="Color / type"
                  value={[
                    selectedBooking.carId.color,
                    selectedBooking.carId.carType,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
                <Detail
                  title="Parking"
                  value={selectedBooking.carId.parkingSlot}
                />
              </View>
            ) : null}

            <View style={styles.detailSection}>
              <View style={styles.sectionHeading}>
                <Feather name="user" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Wash professional</Text>
              </View>
              {typeof selectedBooking.workerId === 'object' &&
              selectedBooking.workerId ? (
                <>
                  <View style={styles.workerIdentity}>
                    {selectedBooking.workerId.imageUrl ? (
                      <Image
                        source={{ uri: selectedBooking.workerId.imageUrl }}
                        style={styles.workerAvatar}
                      />
                    ) : (
                      <View style={styles.workerAvatarPlaceholder}>
                        <Feather name="user" size={18} color={colors.primary} />
                      </View>
                    )}
                    <Text style={styles.workerName}>
                      {selectedBooking.workerId.name || 'Assigned worker'}
                    </Text>
                  </View>
                  <Detail
                    title="Worker phone"
                    value={selectedBooking.workerId.phone}
                  />
                  <Detail
                    title="Worker email"
                    value={selectedBooking.workerId.email}
                  />
                </>
              ) : (
                <Text style={styles.body}>Not assigned yet</Text>
              )}
              <Detail
                title="Worker notes"
                value={selectedBooking.workerNotes || 'No notes'}
              />
            </View>

            <View style={styles.detailSection}>
              <View style={styles.sectionHeading}>
                <Feather name="activity" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Work timeline</Text>
              </View>
              {selectedBooking.workSessions?.length ? (
                selectedBooking.workSessions.map((session, index) => (
                  <View
                    key={`${session.startedAt}-${index}`}
                    style={styles.timelineItem}
                  >
                    <View style={styles.timelineMarker} />
                    <View style={styles.timelineCopy}>
                      <Text style={styles.timelineTitle}>
                        {index === 0 ? 'Work started' : 'Work resumed'}
                      </Text>
                      <Text style={styles.body}>
                        {formatTimestamp(session.startedAt)}
                      </Text>
                      {session.endedAt ? (
                        <Text style={styles.body}>
                          Stopped: {formatTimestamp(session.endedAt)} · Duration{' '}
                          {formatDuration(session.durationSeconds)}
                        </Text>
                      ) : (
                        <Text style={styles.successText}>
                          Currently working
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.body}>Work has not been started yet.</Text>
              )}
              {selectedBooking.workCompletedAt ? (
                <Text style={styles.successText}>
                  Completed at{' '}
                  {formatTimestamp(selectedBooking.workCompletedAt)} · Total
                  time {formatDuration(selectedBooking.totalWorkingSeconds)}
                </Text>
              ) : null}
            </View>

            <View style={styles.detailSection}>
              <View style={styles.sectionHeading}>
                <Feather name="check-square" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Cleaning checklist</Text>
              </View>
              {checklistItems.map(item => {
                const done =
                  selectedBooking.cleaningChecklist?.[item.key] ?? false;
                return (
                  <View key={item.key} style={styles.checklistRow}>
                    <Feather
                      name={done ? 'check-circle' : 'circle'}
                      size={17}
                      color={done ? colors.success : colors.muted}
                    />
                    <Text style={styles.checklistLabel}>{item.label}</Text>
                    <Text
                      style={done ? styles.successText : styles.pendingText}
                    >
                      {done ? 'Done' : 'Pending'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.detailSection}>
              <View style={styles.sectionHeading}>
                <Feather name="camera" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Cleaning photos</Text>
              </View>
              <View style={styles.photos}>
                <Photo
                  title="Before cleaning"
                  uri={selectedBooking.beforePhoto}
                />
                <Photo
                  title="After cleaning"
                  uri={selectedBooking.afterPhoto}
                />
              </View>
            </View>
          </>
        ) : null}
      </DetailsSheet>
    </Page>
  );
};

const Detail = ({ title, value }: { title: string; value?: string }) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

const StatusStat = ({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) => (
  <Card style={styles.stat}>
    <View style={styles.statIcon}>
      <Feather name={icon} size={15} color={colors.primary} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const Photo = ({ title, uri }: { title: string; uri?: string }) => (
  <View style={styles.photoColumn}>
    <Text style={styles.detailLabel}>{title}</Text>
    {uri ? (
      <Image source={{ uri }} style={styles.photo} />
    ) : (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <Text style={styles.body}>Not uploaded</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 5,
    gap: 4,
    borderRadius: 13,
  },
  statIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  bookingCard: {
    gap: 12,
    padding: 14,
    borderRadius: 19,
    borderColor: '#DCE8ED',
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookingIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  bookingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bookingMetaIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F6F7',
  },
  bookingMetaCopy: { flex: 1, minWidth: 0, gap: 2 },
  bookingMetaLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  bookingMetaValue: { fontSize: 12, fontWeight: '600', color: colors.ink },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bookingAmountGroup: { flex: 1, minWidth: 0, gap: 2 },
  bookingAmount: { fontSize: 15, fontWeight: '900', color: colors.primaryDark },
  paymentStatus: {
    maxWidth: '40%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  flex: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted },
  statusBadge: {
    maxWidth: 105,
    flexShrink: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 11,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  inProgressBadge: { backgroundColor: '#E8F1FF' },
  inProgressText: { color: '#175CD3' },
  pausedBadge: { backgroundColor: '#F4EBFF' },
  pausedText: { color: '#6941C6' },
  completedBadge: { backgroundColor: '#ECFDF3' },
  completedText: { color: '#027A48' },
  cancelledBadge: { backgroundColor: '#FEF3F2' },
  cancelledText: { color: '#B42318' },
  notStartedBadge: { backgroundColor: '#FFFAEB' },
  notStartedText: { color: '#B54708' },
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
  emptyCard: { alignItems: 'flex-start', gap: 11, borderRadius: 18 },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  detailCarImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  workerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.canvas,
  },
  workerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paleBlue,
  },
  workerName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  detailsHero: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D5E9E9',
    borderRadius: 18,
    backgroundColor: '#F3FAFA',
  },
  detailsHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsHeroCopy: { flex: 1, minWidth: 0, gap: 4 },
  detailsHeroTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  detailsHeroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D5E2E5',
  },
  detailsHeroFooter: { flexDirection: 'row', gap: 12 },
  detailsHeroMetric: { flex: 1, minWidth: 0, gap: 4 },
  detailsHeroLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  detailsHeroValue: { fontSize: 12, fontWeight: '700', color: colors.ink },
  detailSection: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2EAF0',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    shadowColor: '#16324A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE6EC',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  detailButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  detailButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  detail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E9EE',
  },
  detailLabel: { flex: 1, fontSize: 12, color: colors.muted },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  timelineMarker: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineCopy: { flex: 1, gap: 3 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.success,
  },
  pendingText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E1E9EE',
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  photos: { flexDirection: 'row', gap: 10 },
  photoColumn: { flex: 1, gap: 5 },
  photo: {
    width: '100%',
    height: 125,
    borderRadius: 10,
    backgroundColor: colors.canvas,
  },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});

export default CustomerStatusScreen;

import React, {useMemo, useState} from 'react';
import {
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  Card,
  colors,
  DetailsSheet,
  InfoMessage,
  LoadingMessage,
  ListItemPressable,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {useGetMyBookingsQuery} from '../../store/customer.api';
import {Booking, RelatedEntity} from '../../store/types';

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

const statusColor = (booking: Booking) => {
  switch (workStatus(booking)) {
    case 'In progress':
      return styles.inProgress;
    case 'Paused':
      return styles.paused;
    case 'Completed':
      return styles.completed;
    case 'Cancelled':
      return styles.cancelled;
    default:
      return styles.notStarted;
  }
};

const checklistItems: {
  label: string;
  key: keyof NonNullable<Booking['cleaningChecklist']>;
}[] = [
  {label: 'Exterior wash', key: 'exteriorWash'},
  {label: 'Interior cleaning', key: 'interiorCleaning'},
  {label: 'Dashboard', key: 'dashboard'},
  {label: 'Tyre dressing', key: 'tyreDressing'},
  {label: 'Vacuum cleaning', key: 'vacuumCleaning'},
];

const CustomerStatusScreen = () => {
  const {data, isLoading, isFetching, isError, refetch} =
    useGetMyBookingsQuery(undefined, {pollingInterval: 30_000});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const bookings = useMemo(() => data?.data ?? [], [data?.data]);
  const activeCount = bookings.filter(booking =>
    ['Working', 'Paused'].includes(booking.workStatus || '') ||
    booking.status === 'InProgress',
  ).length;
  const completedCount = bookings.filter(
    booking =>
      booking.status === 'Completed' || booking.workStatus === 'Completed',
  ).length;

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
        title="Cleaning status"
        subtitle="Worker updates and cleaning timelines"
      />
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
      {isLoading ? (
        <LoadingMessage text="Loading cleaning status..." />
      ) : isError ? (
        <InfoMessage
          text="Cleaning status could not be loaded. Please retry."
          variant="error"
        />
      ) : bookings.length ? (
        <View style={styles.list}>
          {bookings.map(booking => (
            <ListItemPressable
              key={booking._id}
              accessibilityLabel={`View ${booking.serviceNameSnapshot || 'cleaning task'} details`}
              onPress={() => setSelectedBooking(booking)}>
              <Card style={styles.bookingCard}>
                <View style={styles.row}>
                  {typeof booking.carId !== 'string' && booking.carId.imageUrl ? (
                    <Image
                      source={{uri: booking.carId.imageUrl}}
                      style={styles.carImage}
                    />
                  ) : null}
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {booking.serviceNameSnapshot || 'Car wash'}
                    </Text>
                    <Text style={styles.body} numberOfLines={1}>
                      {labelOf(booking.carId)} · {formatDate(booking.bookingDate)} ·{' '}
                      {booking.bookingTime}
                    </Text>
                  </View>
                  <Text style={[styles.badge, statusColor(booking)]} numberOfLines={1}>
                    {workStatus(booking)}
                  </Text>
                </View>
                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>View full details</Text>
                  <Feather name="chevron-right" size={17} color={colors.primary} />
                </View>
              </Card>
            </ListItemPressable>
          ))}
        </View>
      ) : (
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
      )}

      <DetailsSheet
        visible={Boolean(selectedBooking)}
        setVisible={visible => !visible && setSelectedBooking(null)}
        title="Cleaning task details">
            {selectedBooking ? (
              <>
                <View style={styles.detailGrid}>
                  <Detail title="Service" value={selectedBooking.serviceNameSnapshot} />
                  <Detail title="Car" value={labelOf(selectedBooking.carId)} />
                  <Detail
                    title="Scheduled"
                    value={`${formatDate(selectedBooking.bookingDate)} · ${selectedBooking.bookingTime}`}
                  />
                  <Detail title="Booking status" value={selectedBooking.status} />
                  <Detail title="Worker status" value={workStatus(selectedBooking)} />
                  <Detail
                    title="Payment"
                    value={`${selectedBooking.paymentType} · ${selectedBooking.paymentStatus}`}
                  />
                  <Detail
                    title="Amount"
                    value={`₹${Number(selectedBooking.amountPayable || 0).toFixed(2)}`}
                  />
                  {typeof selectedBooking.carId !== 'string' ? (
                    <>
                      {selectedBooking.carId.imageUrl ? (
                        <Image
                          source={{uri: selectedBooking.carId.imageUrl}}
                          style={styles.detailCarImage}
                        />
                      ) : null}
                      <Detail
                        title="Color / type"
                        value={[
                          selectedBooking.carId.color,
                          selectedBooking.carId.carType,
                        ].filter(Boolean).join(' · ')}
                      />
                      <Detail
                        title="Parking"
                        value={selectedBooking.carId.parkingSlot}
                      />
                    </>
                  ) : null}
                  {typeof selectedBooking.workerId === 'object' &&
                  selectedBooking.workerId ? (
                    <>
                      <View style={styles.workerIdentity}>
                        {selectedBooking.workerId.imageUrl ? (
                          <Image
                            source={{uri: selectedBooking.workerId.imageUrl}}
                            style={styles.workerAvatar}
                          />
                        ) : null}
                        <Text style={styles.cardTitle}>
                          {selectedBooking.workerId.name || 'Assigned worker'}
                        </Text>
                      </View>
                      <Detail title="Worker phone" value={selectedBooking.workerId.phone} />
                      <Detail title="Worker email" value={selectedBooking.workerId.email} />
                    </>
                  ) : (
                    <Detail title="Worker" value="Not assigned yet" />
                  )}
                  <Detail
                    title="Worker notes"
                    value={selectedBooking.workerNotes || 'No notes'}
                  />
                </View>

                <Text style={styles.sectionTitle}>Work timeline</Text>
                {selectedBooking.workSessions?.length ? (
                  selectedBooking.workSessions.map((session, index) => (
                    <View
                      key={`${session.startedAt}-${index}`}
                      style={styles.timelineItem}>
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
                        <Text style={styles.successText}>Currently working</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.body}>Work has not been started yet.</Text>
                )}
                {selectedBooking.workCompletedAt ? (
                  <Text style={styles.successText}>
                    Completed at {formatTimestamp(selectedBooking.workCompletedAt)} ·
                    Total time {formatDuration(selectedBooking.totalWorkingSeconds)}
                  </Text>
                ) : null}

                <Text style={styles.sectionTitle}>Cleaning checklist</Text>
                {checklistItems.map(item => {
                  const done =
                    selectedBooking.cleaningChecklist?.[item.key] ?? false;
                  return (
                    <View key={item.key} style={styles.checklistRow}>
                      <Text style={styles.body}>{item.label}</Text>
                      <Text style={done ? styles.successText : styles.body}>
                        {done ? 'Done' : 'Pending'}
                      </Text>
                    </View>
                  );
                })}

                <Text style={styles.sectionTitle}>Cleaning photos</Text>
                <View style={styles.photos}>
                  <Photo title="Before cleaning" uri={selectedBooking.beforePhoto} />
                  <Photo title="After cleaning" uri={selectedBooking.afterPhoto} />
                </View>
              </>
            ) : null}
      </DetailsSheet>
    </Page>
  );
};

const Detail = ({title, value}: {title: string; value?: string}) => (
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

const Photo = ({title, uri}: {title: string; uri?: string}) => (
  <View style={styles.photoColumn}>
    <Text style={styles.detailLabel}>{title}</Text>
    {uri ? (
      <Image source={{uri}} style={styles.photo} />
    ) : (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <Text style={styles.body}>Not uploaded</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  stats: {flexDirection: 'row', gap: 8},
  stat: {flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 5, gap: 4, borderRadius: 13},
  statIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  statValue: {fontSize: 17, fontWeight: '800', color: colors.ink},
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  list: {gap: 10},
  bookingCard: {gap: 8, borderRadius: 14, paddingVertical: 11},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  carImage: {width: 62, height: 48, borderRadius: 8, backgroundColor: colors.canvas},
  detailCarImage: {width: '100%', height: 140, borderRadius: 12, backgroundColor: colors.canvas},
  workerIdentity: {flexDirection: 'row', alignItems: 'center', gap: 8},
  workerAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.canvas},
  flex: {flex: 1, minWidth: 0},
  cardTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  emptyCard: {alignItems: 'flex-start', gap: 11, borderRadius: 18},
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  badge: {
    maxWidth: '34%',
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  inProgress: {backgroundColor: '#E8F1FF', color: '#175CD3'},
  paused: {backgroundColor: '#F4EBFF', color: '#6941C6'},
  completed: {backgroundColor: '#ECFDF3', color: '#027A48'},
  cancelled: {backgroundColor: '#FEF3F2', color: '#B42318'},
  notStarted: {backgroundColor: '#FFFAEB', color: '#B54708'},
  detailButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  detailButtonText: {fontSize: 13, fontWeight: '700', color: colors.primary},
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  detail: {width: '47%', gap: 2},
  detailLabel: {fontSize: 11, color: colors.muted},
  detailValue: {fontSize: 13, fontWeight: '600', color: colors.ink},
  sectionTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  timelineItem: {borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 10, gap: 2},
  timelineTitle: {fontSize: 13, fontWeight: '700', color: colors.ink},
  successText: {fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.success},
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photos: {flexDirection: 'row', gap: 10},
  photoColumn: {flex: 1, gap: 5},
  photo: {width: '100%', height: 125, borderRadius: 10, backgroundColor: colors.canvas},
  photoPlaceholder: {alignItems: 'center', justifyContent: 'center'},
});

export default CustomerStatusScreen;

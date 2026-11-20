import React, {useMemo, useState} from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
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
    <Page>
      <PageTitle
        title="Cleaning status"
        subtitle="Track worker updates, cleaning progress, and task timelines for your cars."
      />
      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{isLoading ? '—' : bookings.length}</Text>
          <Text style={styles.statLabel}>Wash tasks</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{isLoading ? '—' : activeCount}</Text>
          <Text style={styles.statLabel}>In progress</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{isLoading ? '—' : completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </Card>
      </View>
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh status'}
        variant="secondary"
        onPress={() => refetch()}
        disabled={isFetching}
      />
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
            <Card key={booking._id} style={styles.bookingCard}>
              <View style={styles.row}>
                {typeof booking.carId !== 'string' && booking.carId.imageUrl ? (
                  <Image
                    source={{uri: booking.carId.imageUrl}}
                    style={styles.carImage}
                  />
                ) : null}
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>
                    {booking.serviceNameSnapshot || 'Car wash'}
                  </Text>
                  <Text style={styles.body}>
                    {labelOf(booking.carId)} · {formatDate(booking.bookingDate)} at{' '}
                    {booking.bookingTime}
                  </Text>
                </View>
                <Text style={[styles.badge, statusColor(booking)]}>
                  {workStatus(booking)}
                </Text>
              </View>
              <Text style={styles.body}>
                Booking: {booking.status} · {booking.paymentType}
              </Text>
              <ActionButton
                title="View task details"
                variant="secondary"
                onPress={() => setSelectedBooking(booking)}
              />
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>No wash tasks yet</Text>
          <Text style={styles.body}>
            Worker progress and cleaning history will appear here after you book
            a wash.
          </Text>
        </Card>
      )}

      <Modal
        visible={Boolean(selectedBooking)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Cleaning task details</Text>
                <Text style={styles.body}>
                  Worker updates and times are shown in India time.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close task details"
                onPress={() => setSelectedBooking(null)}
                style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            {selectedBooking ? (
              <View style={styles.modalContent}>
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
              </View>
            ) : null}
          </Card>
        </View>
      </Modal>
    </Page>
  );
};

const Detail = ({title, value}: {title: string; value?: string}) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
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
  stat: {flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2},
  statValue: {fontSize: 21, fontWeight: '800', color: colors.ink},
  statLabel: {fontSize: 11, color: colors.muted, textAlign: 'center'},
  list: {gap: 10},
  bookingCard: {gap: 9},
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  carImage: {width: 62, height: 48, borderRadius: 8, backgroundColor: colors.canvas},
  flex: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  badge: {
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  inProgress: {backgroundColor: '#E8F1FF', color: '#175CD3'},
  paused: {backgroundColor: '#F4EBFF', color: '#6941C6'},
  completed: {backgroundColor: '#ECFDF3', color: '#027A48'},
  cancelled: {backgroundColor: '#FEF3F2', color: '#B42318'},
  notStarted: {backgroundColor: '#FFFAEB', color: '#B54708'},
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16, 35, 52, 0.55)',
  },
  modalCard: {
    maxHeight: '92%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: 14,
  },
  modalHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {fontSize: 25, lineHeight: 28, color: colors.ink},
  modalContent: {gap: 12, paddingBottom: 8},
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

import React, {useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import DateTimePicker, {
  DateType,
  useDefaultStyles,
} from 'react-native-ui-datepicker';
import {
  ActionButton,
  Card,
  colors,
  DetailsSheet,
  InfoMessage,
  LoadingSkeleton,
  LoadingMessage,
  ListItemPressable,
  Page,
  TextField,
} from '../../components/mobile/ui';
import {BottomSheet} from '../../components/bottomSheet/BottomSheet';
import {
  useGetAvailableSlotsQuery,
  useGetMyBookingsQuery,
  useGetMyCarsQuery,
  useCreateCashReceiptLinkMutation,
  useStartStripeBookingCheckoutMutation,
  useSubmitBookingReviewMutation,
  useUpdateCustomerBookingMutation,
} from '../../store/customer.api';
import {useAppSelector} from '../../store/hooks';
import {Booking} from '../../store/types';
import {Slot} from '../../store/types';
import {singleDayAvailabilityRange} from '../../utils/availability-range';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';
import {savePendingStripePayment} from '../../store/pending-payment';

type Props = BottomTabScreenProps<NavigatorParamList, 'CustomerDashboard'>;

const CustomerHomeScreen = ({navigation}: Props) => {
  const user = useAppSelector(state => state.auth.user);
  const bookingsQuery = useGetMyBookingsQuery();
  const carsQuery = useGetMyCarsQuery();
  const bookings = bookingsQuery.data?.data ?? [];
  const pendingBookings = bookings.filter(
    booking => booking.status === 'Pending',
  ).length;
  const completedBookings = bookings.filter(
    booking => booking.status === 'Completed',
  ).length;
  const upcoming = bookings
    .filter(booking => !['Completed', 'Cancelled'].includes(booking.status))
    .slice(0, 3);

  return (
    <Page
      listData={
        bookingsQuery.isLoading || bookingsQuery.isError ? [] : upcoming
      }
      listKeyExtractor={booking => booking._id}
      renderListItem={({item}) => <BookingPreview booking={item} />}
      refreshControl={
        <RefreshControl
          refreshing={bookingsQuery.isFetching || carsQuery.isFetching}
          onRefresh={() => {
            bookingsQuery.refetch();
            carsQuery.refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <View style={styles.hero}>
        <View style={styles.heroDecoration} />
        <View style={styles.heroEyebrow}>
          <Feather name="sun" size={13} color="#B5E4E2" />
          <Text style={styles.heroEyebrowText}>CAR CARE, MADE EASY</Text>
        </View>
        <Text style={styles.heroTitle}>
          Hi {user?.name?.trim().split(/\s+/)[0] || 'there'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Your next wash is just a few taps away.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CustomerBooking')}
          style={({pressed}) => [
            styles.bookButton,
            pressed && styles.heroButtonPressed,
          ]}>
          <Feather name="calendar" size={17} color={colors.primaryDark} />
          <Text style={styles.bookButtonText}>Book a wash</Text>
          <Feather
            name="arrow-up-right"
            size={17}
            color={colors.primaryDark}
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('CustomerSociety')}
        style={({pressed}) => [
          styles.assetsButton,
          pressed && styles.assetsButtonPressed,
        ]}>
        <View style={styles.assetsIcon}>
          <Feather name="truck" size={18} color={colors.primary} />
        </View>
        <View style={styles.assetsCopy}>
          <Text style={styles.assetsTitle} numberOfLines={1}>Set up home & cars</Text>
          <Text style={styles.assetsSubtitle} numberOfLines={1}>
            Manage your location and vehicles
          </Text>
        </View>
        <Feather name="chevron-right" size={19} color={colors.muted} />
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Your activity</Text>
        <Text style={styles.sectionCaption}>ALL TIME</Text>
      </View>
      <View style={styles.stats}>
        <StatTile
          icon="calendar"
          label="Bookings"
          value={bookingsQuery.isLoading
            ? '—'
            : bookingsQuery.isError
              ? '!'
              : String(bookings.length)}
          tint="teal"
        />
        <StatTile
          icon="clock"
          label="Pending"
          value={bookingsQuery.isLoading
            ? '—'
            : bookingsQuery.isError
              ? '!'
              : String(pendingBookings)}
          tint="orange"
        />
        <StatTile
          icon="check-circle"
          label="Completed"
          value={bookingsQuery.isLoading
            ? '—'
            : bookingsQuery.isError
              ? '!'
              : String(completedBookings)}
          tint="green"
        />
        <StatTile
          icon="truck"
          label="My cars"
          value={carsQuery.isLoading
            ? '—'
            : carsQuery.isError
              ? '!'
              : String(carsQuery.data?.data.length ?? 0)}
          tint="blue"
        />
      </View>

      <View style={styles.heading}>
        <View style={styles.upcomingHeading}>
          <Text style={styles.sectionTitle}>Upcoming washes</Text>
          <Text style={styles.sectionCaption}>YOUR NEXT BOOKINGS</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CustomerBookings')}
          style={styles.viewAllButton}>
          <Text style={styles.link}>View all</Text>
          <Feather name="arrow-right" size={15} color={colors.primary} />
        </Pressable>
      </View>

      {bookingsQuery.isLoading ? (
        <LoadingSkeleton rows={2} />
      ) : bookingsQuery.isError ? (
        <InfoMessage text="Bookings could not be loaded. Pull to refresh from My Bookings." variant="error" />
      ) : upcoming.length ? null : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={20} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No upcoming washes</Text>
          <Text style={styles.body}>
            Pick a service, choose a day and book one of the available time slots.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CustomerBooking')}
            style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Plan your first wash</Text>
            <Feather name="arrow-right" size={15} color={colors.primary} />
          </Pressable>
        </Card>
      )}
    </Page>
  );
};

const statTints = {
  teal: {background: '#E4F3F2', foreground: '#087F8C'},
  orange: {background: '#FFF1E2', foreground: '#BE6A18'},
  green: {background: '#E7F5EE', foreground: '#19805B'},
  blue: {background: '#EAF0FF', foreground: '#526BC4'},
};

const StatTile = ({
  icon,
  label,
  value,
  tint,
}: {
  icon: string;
  label: string;
  value: string;
  tint: keyof typeof statTints;
}) => (
  <Card style={styles.statTile}>
    <View style={styles.statTileTop}>
      <View
        style={[
          styles.statIcon,
          {backgroundColor: statTints[tint].background},
        ]}>
        <Feather
          name={icon}
          size={16}
          color={statTints[tint].foreground}
        />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const formatTimelineTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
};

const formatWorkDuration = (value?: number) => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map(part => String(part).padStart(2, '0'))
    .join(':');
};

const DetailRow = ({title, value}: {title: string; value: string}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export const BookingPreview = ({booking}: {booking: Booking}) => {
  const [rescheduling, setRescheduling] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [detailsVisible, setDetailsVisible] = useState(false);
  const dateStyles = useDefaultStyles();
  const [startCheckout, checkoutState] =
    useStartStripeBookingCheckoutMutation();
  const [createReceiptLink, receiptState] =
    useCreateCashReceiptLinkMutation();
  const [updateBooking, updateState] = useUpdateCustomerBookingMutation();
  const [submitReview, reviewState] = useSubmitBookingReviewMutation();
  const serviceId =
    typeof booking.serviceId === 'string'
      ? booking.serviceId
      : booking.serviceId?._id ?? '';
  const car = typeof booking.carId === 'string' ? null : booking.carId;
  const worker =
    typeof booking.workerId === 'string' ? null : booking.workerId;
  const carLabel = car
    ? [car.registrationNumber, car.make, car.model].filter(Boolean).join(' ')
    : 'Car details unavailable';
  const statusLabel =
    booking.status === 'InProgress' ? 'In progress' : booking.status;
  const statusBadgeTone =
    booking.status === 'Completed'
      ? styles.statusBadgeComplete
      : booking.status === 'Cancelled'
        ? styles.statusBadgeCancelled
        : booking.status === 'InProgress'
          ? styles.statusBadgeActive
          : styles.statusBadgeUpcoming;
  const statusTextTone =
    booking.status === 'Completed'
      ? styles.statusTextComplete
      : booking.status === 'Cancelled'
        ? styles.statusTextCancelled
        : booking.status === 'InProgress'
          ? styles.statusTextActive
          : styles.statusTextUpcoming;
  const workStatusLabel =
    {
      NotStarted: 'Not started',
      Working: 'In progress',
      Paused: 'Paused',
      Completed: 'Completed',
    }[booking.workStatus || 'NotStarted'];
  const paymentStatusLabel =
    booking.amountPayable === 0
      ? 'Covered by membership'
      : booking.paymentMethod === 'Cash' && booking.paymentStatus !== 'Paid'
        ? 'Cash due on service day'
        : booking.paymentStatus || 'Payment pending';
  const availabilityRange = singleDayAvailabilityRange(rescheduleDate);
  const slotsQuery = useGetAvailableSlotsQuery(
    {serviceId, ...availabilityRange},
    {skip: !rescheduling || !serviceId || !rescheduleDate},
  );
  const availableSlots = useMemo(
    () => (slotsQuery.data?.data ?? []).filter(slot => slot.isBooked === 'available'),
    [slotsQuery.data],
  );

  const payOnline = async () => {
    try {
      const checkout = await startCheckout({bookingId: booking._id}).unwrap();
      await savePendingStripePayment({
        sessionId: checkout.data.sessionId,
        kind: 'booking',
      });
      await Linking.openURL(checkout.data.url);
    } catch {
      Alert.alert(
        'Checkout unavailable',
        'Unable to start payment. Please try again later.',
      );
    }
  };

  const downloadCashReceipt = async () => {
    try {
      const result = await createReceiptLink(booking._id).unwrap();
      await Linking.openURL(result.data.url);
    } catch (error) {
      Alert.alert(
        'Receipt unavailable',
        (error as {data?: {message?: string}}).data?.message ||
          'The cash receipt could not be opened. Please try again.',
      );
    }
  };

  const saveReschedule = async () => {
    const slot = availableSlots.find(item => item._id === selectedSlotId);
    if (!slot || !rescheduleDate) {
      setRescheduleError('Choose an available date and time slot.');
      return;
    }
    try {
      setRescheduleError('');
      await updateBooking({
        id: booking._id,
        body: {
          bookingDate: rescheduleDate,
          bookingTime: slot.startTime,
          slotId: slot._id,
        },
      }).unwrap();
      setRescheduling(false);
      setSelectedSlotId('');
    } catch (error) {
      setRescheduleError(
        (error as {data?: {message?: string}}).data?.message ||
          'Could not reschedule this booking.',
      );
    }
  };
  const saveReview = async () => {
    if (!rating) {
      setReviewError('Choose a rating from 1 to 5 stars.');
      return;
    }
    try {
      setReviewError('');
      await submitReview({
        id: booking._id,
        rating,
        ...(review.trim() ? {review: review.trim()} : {}),
      }).unwrap();
    } catch (error) {
      setReviewError(
        (error as {data?: {message?: string}}).data?.message ||
          'Could not submit your review.',
      );
    }
  };

  return (
    <Card style={styles.bookingPreview}>
      <ListItemPressable
        accessibilityLabel={`View ${booking.serviceNameSnapshot || 'booking'} details`}
        onPress={() => setDetailsVisible(true)}
        style={styles.bookingSummary}>
        <View style={styles.bookingCardHeader}>
          <View style={styles.bookingServiceIcon}>
            <Feather name="droplet" size={18} color={colors.primary} />
          </View>
          <View style={styles.bookingServiceCopy}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {booking.serviceNameSnapshot || 'Car wash'}
            </Text>
            <Text style={styles.bookingCar} numberOfLines={1}>
              {carLabel}
            </Text>
          </View>
          <View style={[styles.statusBadge, statusBadgeTone]}>
            <Text
              style={[styles.statusBadgeText, statusTextTone]}
              numberOfLines={1}>
              {statusLabel}
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
              {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {booking.bookingTime}
            </Text>
          </View>
        </View>
        <View style={styles.bookingCardFooter}>
          <View style={styles.bookingAmountGroup}>
            <Text style={styles.bookingMetaLabel}>BOOKING TOTAL</Text>
            <Text
              style={styles.bookingAmount}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {booking.amountPayable === 0
                ? 'Membership wash'
                : `₹${Number(booking.amountPayable).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </Text>
            <Text style={styles.bookingPaymentStatus} numberOfLines={1}>
              {paymentStatusLabel}
            </Text>
          </View>
          <Text style={styles.bookingWorkStatus} numberOfLines={1}>
            {workStatusLabel}
          </Text>
        </View>
      </ListItemPressable>
      <ListItemPressable
        accessibilityLabel="Manage booking"
        onPress={() => setDetailsVisible(true)}
        style={styles.manageLink}>
        <Text style={styles.manageLinkText}>View booking details</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </ListItemPressable>
      <DetailsSheet
        visible={detailsVisible}
        setVisible={setDetailsVisible}
        title="Booking details & work timeline">
        <View style={styles.bookingDetailHero}>
          <View style={styles.bookingDetailHeroHeader}>
            <View style={styles.bookingDetailHeroIcon}>
              <Feather name="droplet" size={20} color={colors.primary} />
            </View>
            <View style={styles.bookingDetailHeroCopy}>
              <Text style={styles.bookingDetailHeroTitle} numberOfLines={2}>
                {booking.serviceNameSnapshot || 'Car wash'}
              </Text>
              <Text style={styles.bookingCar} numberOfLines={1}>
                {carLabel}
              </Text>
            </View>
            <View style={[styles.statusBadge, statusBadgeTone]}>
              <Text
                style={[styles.statusBadgeText, statusTextTone]}
                numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.bookingDetailDivider} />
          <View style={styles.bookingDetailHeroFooter}>
            <View style={styles.bookingHeroMetric}>
              <Text style={styles.bookingMetaLabel}>SCHEDULED</Text>
              <Text style={styles.bookingMetaValue}>
                {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {booking.bookingTime}
              </Text>
            </View>
            <View style={styles.bookingHeroMetric}>
              <Text style={styles.bookingMetaLabel}>TOTAL</Text>
              <Text style={styles.bookingAmount}>
                {booking.amountPayable === 0
                  ? 'Membership'
                  : `₹${Number(booking.amountPayable).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.timezoneHint}>
          <Feather name="clock" size={13} color={colors.muted} />
          <Text style={styles.timezoneText}>Times shown in India time</Text>
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="credit-card" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Booking & payment</Text>
          </View>
          <DetailRow title="Booking status" value={booking.status} />
          <DetailRow title="Work status" value={workStatusLabel} />
          <DetailRow
            title="Payment"
            value={`${booking.paymentType} · ${booking.paymentMethod || '—'} · ${booking.paymentStatus}`}
          />
          {booking.paymentMethod === 'Cash' ? (
            <DetailRow
              title="Cash collection"
              value={
                booking.cashCollectionStatus ||
                (booking.paymentStatus === 'Paid' ? 'Received' : 'Not recorded')
              }
            />
          ) : null}
          <DetailRow
            title="Amount"
            value={
              booking.amountPayable === 0
                ? 'Covered by membership'
                : `₹${Number(booking.amountPayable).toFixed(2)}`
            }
          />
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="truck" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Vehicle details</Text>
          </View>
          {car?.imageUrl ? (
            <Image
              source={{uri: car.imageUrl}}
              style={styles.vehicleDetailImage}
              resizeMode="cover"
            />
          ) : null}
          <DetailRow title="Registration" value={car?.registrationNumber || '—'} />
          <DetailRow
            title="Make / model"
            value={[car?.make, car?.model].filter(Boolean).join(' ') || '—'}
          />
          <DetailRow title="Color" value={car?.color || '—'} />
          <DetailRow title="Vehicle type" value={car?.carType || '—'} />
          <DetailRow title="Parking" value={car?.parkingSlot || '—'} />
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Wash professional</Text>
          </View>
          {worker ? (
            <>
              <View style={styles.workerIdentity}>
                {worker.imageUrl ? (
                  <Image
                    source={{uri: worker.imageUrl}}
                    style={styles.workerAvatar}
                  />
                ) : (
                  <View
                    style={[styles.workerAvatar, styles.workerAvatarPlaceholder]}>
                    <Feather name="user" size={20} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.workerName}>
                  {worker.name || 'Assigned worker'}
                </Text>
              </View>
              <DetailRow title="Phone" value={worker.phone || '—'} />
              <DetailRow title="Email" value={worker.email || '—'} />
              <DetailRow title="Status" value={worker.status || '—'} />
            </>
          ) : (
            <Text style={styles.body}>A worker has not been assigned yet.</Text>
          )}
        </View>
        {booking.paymentType === 'Individual' &&
        booking.paymentMethod !== 'Cash' &&
        booking.paymentStatus !== 'Paid' &&
        !['Cancelled', 'Completed'].includes(booking.status) ? (
          <ActionButton
            title={checkoutState.isLoading ? 'Opening checkout...' : 'Pay online'}
            onPress={payOnline}
            disabled={checkoutState.isLoading}
          />
        ) : null}
        {!['Completed', 'Cancelled', 'InProgress'].includes(booking.status) ? (
          <ActionButton
            title="Reschedule"
            variant="secondary"
            onPress={() => {
              const date = new Date();
              setRescheduleDate(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              );
              setSelectedSlotId('');
              setRescheduleError('');
              setDetailsVisible(false);
              setRescheduling(true);
            }}
          />
        ) : null}
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="camera" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Cleaning photos</Text>
          </View>
          <View style={styles.photoRow}>
            {[
              ['Before cleaning', booking.beforePhoto],
              ['After cleaning', booking.afterPhoto],
            ].map(([title, photo]) => (
              <View key={title} style={styles.photoItem}>
                <Text style={styles.body}>{title}</Text>
                {photo ? (
                  <Image source={{uri: photo}} style={styles.photo} />
                ) : (
                  <Text style={styles.photoPlaceholder}>Not uploaded</Text>
                )}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="check-square" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Cleaning checklist</Text>
          </View>
          {[
            ['Exterior wash', 'exteriorWash'],
            ['Interior cleaning', 'interiorCleaning'],
            ['Dashboard', 'dashboard'],
            ['Tyre dressing', 'tyreDressing'],
            ['Vacuum cleaning', 'vacuumCleaning'],
          ].map(([title, key]) => {
            const done =
              booking.cleaningChecklist?.[
                key as keyof NonNullable<Booking['cleaningChecklist']>
              ];
            return (
              <DetailRow
                key={key}
                title={title}
                value={done ? 'Done' : 'Pending'}
              />
            );
          })}
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Worker notes</Text>
          </View>
          <Text style={styles.body}>
            {booking.workerNotes || 'No worker notes'}
          </Text>
        </View>
        <View style={styles.bookingDetailsSection}>
          <View style={styles.bookingSectionHeading}>
            <Feather name="activity" size={16} color={colors.primary} />
            <Text style={styles.bookingDetailsHeading}>Work timeline</Text>
          </View>
          {(booking.workSessions || []).map((session, index) => (
            <View
              key={`${session.startedAt}-${index}`}
              style={styles.timelineEntry}>
              <Text style={styles.timelineTitle}>
                {index === 0 ? 'Work started' : 'Work resumed'}
              </Text>
              <Text style={styles.body}>
                {formatTimelineTime(session.startedAt)}
              </Text>
              {session.endedAt ? (
                <>
                  <Text style={styles.timelineTitle}>
                    {booking.workStatus === 'Completed' &&
                    index === (booking.workSessions?.length || 0) - 1
                      ? 'Work completed'
                      : 'Work stopped / paused'}
                  </Text>
                  <Text style={styles.body}>
                    {formatTimelineTime(session.endedAt)}
                    {typeof session.durationSeconds === 'number'
                      ? ` · Session duration: ${formatWorkDuration(session.durationSeconds)}`
                      : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.checklistDone}>Session active</Text>
              )}
            </View>
          ))}
          {!booking.workSessions?.length && booking.workCompletedAt ? (
            <Text style={styles.body}>
              Work completed: {formatTimelineTime(booking.workCompletedAt)}
            </Text>
          ) : null}
          {!booking.workSessions?.length && !booking.workCompletedAt ? (
            <Text style={styles.body}>No work sessions recorded yet.</Text>
          ) : null}
          <DetailRow
            title="Total working time"
            value={formatWorkDuration(booking.totalWorkingSeconds)}
          />
          {booking.paymentMethod === 'Cash' &&
          booking.paymentStatus === 'Paid' &&
          (booking.cashCollectionStatus === 'Received' ||
            !booking.cashCollectionStatus) ? (
            <ActionButton
              title={
                receiptState.isLoading
                  ? 'Preparing receipt...'
                  : 'Download cash receipt PDF'
              }
              variant="secondary"
              onPress={downloadCashReceipt}
              disabled={receiptState.isLoading}
            />
          ) : null}
        </View>
        {booking.status === 'Completed' ? (
          booking.customerRating ? (
            <View style={styles.bookingDetailsSection}>
              <View style={styles.bookingSectionHeading}>
                <Feather name="star" size={16} color={colors.primary} />
                <Text style={styles.bookingDetailsHeading}>Your review</Text>
              </View>
              <Text style={styles.reviewStars}>
                {'★'.repeat(booking.customerRating)}
                {'☆'.repeat(5 - booking.customerRating)}
              </Text>
              {booking.customerReview ? (
                <Text style={styles.body}>{booking.customerReview}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.reviewForm}>
              <View style={styles.bookingSectionHeading}>
                <Feather name="star" size={16} color={colors.primary} />
                <Text style={styles.bookingDetailsHeading}>
                  Rate this cleaning
                </Text>
              </View>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(value => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} stars`}
                    accessibilityState={{selected: rating === value}}
                    onPress={() => setRating(value)}>
                    <Text style={styles.ratingStar}>
                      {value <= rating ? '★' : '☆'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextField
                placeholder="Write a review (optional)"
                value={review}
                onChangeText={setReview}
                multiline
                maxLength={1000}
              />
              {reviewError ? (
                <InfoMessage text={reviewError} variant="error" />
              ) : null}
              <ActionButton
                title={reviewState.isLoading ? 'Submitting...' : 'Submit review'}
                onPress={saveReview}
                disabled={reviewState.isLoading}
              />
            </View>
          )
        ) : null}
        <ActionButton
          title="Close details"
          variant="secondary"
          onPress={() => setDetailsVisible(false)}
        />
      </DetailsSheet>
      {!['Completed', 'Cancelled', 'InProgress'].includes(booking.status) ? (
        <>
          {rescheduling ? (
            <BottomSheet
              visible={rescheduling}
              setVisible={setRescheduling}>
              <View style={styles.rescheduleSheet}>
                <View style={styles.rescheduleHeader}>
                  <View style={styles.rescheduleHeaderCopy}>
                    <View style={styles.rescheduleEyebrow}>
                      <Feather
                        name="calendar"
                        size={13}
                        color={colors.primary}
                      />
                      <Text style={styles.rescheduleEyebrowText}>
                        RESCHEDULE SERVICE
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>Update booking</Text>
                    <Text style={styles.rescheduleSubtitle}>
                      Choose a new date and available time.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close reschedule form"
                    onPress={() => setRescheduling(false)}
                    style={styles.closeButton}>
                    <Feather name="x" size={19} color={colors.ink} />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.rescheduleScroll}
                  contentContainerStyle={styles.reschedulePanel}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  automaticallyAdjustKeyboardInsets
                  showsVerticalScrollIndicator={false}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      rescheduleDate
                        ? `Choose date, ${rescheduleDate}`
                        : 'Choose booking date'
                    }
                    onPress={() => setDatePickerVisible(true)}
                    style={({pressed}) => [
                      styles.rescheduleDateCard,
                      pressed && styles.rescheduleDateCardPressed,
                    ]}>
                    <View style={styles.rescheduleDateIcon}>
                      <Feather
                        name="calendar"
                        size={19}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.rescheduleDateCopy}>
                      <Text style={styles.rescheduleDateLabel}>
                        NEW SERVICE DATE
                      </Text>
                      <Text style={styles.rescheduleDateValue}>
                        {rescheduleDate
                          ? new Intl.DateTimeFormat('en-IN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }).format(new Date(`${rescheduleDate}T00:00:00`))
                          : 'Select a date'}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={19}
                      color={colors.muted}
                    />
                  </Pressable>

                  <View style={styles.rescheduleSlotsSection}>
                    <View style={styles.rescheduleSlotsHeading}>
                      <View style={styles.rescheduleSlotsHeadingCopy}>
                        <Text style={styles.rescheduleSectionTitle}>
                          Available time slots
                        </Text>
                        <Text style={styles.rescheduleSectionHint}>
                          {rescheduleDate
                            ? 'Select one time for your service'
                            : 'Choose a date to see available times'}
                        </Text>
                      </View>
                      {availableSlots.length > 0 ? (
                        <View style={styles.rescheduleSlotCount}>
                          <Text style={styles.rescheduleSlotCountText}>
                            {availableSlots.length}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {slotsQuery.isFetching ? (
                      <View style={styles.rescheduleMessageCard}>
                        <LoadingMessage text="Finding available times..." />
                      </View>
                    ) : slotsQuery.isError ? (
                      <InfoMessage
                        text="Available slots could not be loaded. Please try again."
                        variant="error"
                      />
                    ) : availableSlots.length ? (
                      <View style={styles.slotList}>
                        {availableSlots.map((slot: Slot) => {
                          const selected = selectedSlotId === slot._id;
                          return (
                            <Pressable
                              key={slot._id}
                              accessibilityRole="button"
                              accessibilityLabel={`${slot.startTime} to ${slot.endTime}`}
                              accessibilityState={{selected}}
                              onPress={() => setSelectedSlotId(slot._id)}
                              style={({pressed}) => [
                                styles.rescheduleSlot,
                                selected && styles.rescheduleSlotSelected,
                                pressed && styles.rescheduleSlotPressed,
                              ]}>
                              <View
                                style={[
                                  styles.rescheduleSlotIcon,
                                  selected &&
                                    styles.rescheduleSlotIconSelected,
                                ]}>
                                <Feather
                                  name="clock"
                                  size={16}
                                  color={
                                    selected ? colors.primary : colors.muted
                                  }
                                />
                              </View>
                              <View style={styles.rescheduleSlotCopy}>
                                <Text
                                  style={[
                                    styles.rescheduleSlotTime,
                                    selected &&
                                      styles.rescheduleSlotTimeSelected,
                                  ]}>
                                  {slot.startTime}
                                </Text>
                                <Text style={styles.rescheduleSlotEnd}>
                                  Until {slot.endTime}
                                </Text>
                              </View>
                              <Feather
                                name={selected ? 'check-circle' : 'circle'}
                                size={19}
                                color={
                                  selected ? colors.primary : colors.border
                                }
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.rescheduleEmpty}>
                        <View style={styles.rescheduleEmptyIcon}>
                          <Feather
                            name="clock"
                            size={19}
                            color={colors.muted}
                          />
                        </View>
                        <Text style={styles.rescheduleEmptyTitle}>
                          No times available
                        </Text>
                        <Text style={styles.rescheduleEmptyText}>
                          Try another date to find an open service slot.
                        </Text>
                      </View>
                    )}
                  </View>
                  {rescheduleError ? (
                    <InfoMessage text={rescheduleError} variant="error" />
                  ) : null}
                </ScrollView>
                <View style={styles.rescheduleFooter}>
                  <ActionButton
                    title={
                      updateState.isLoading
                        ? 'Saving...'
                        : 'Save new schedule'
                    }
                    onPress={saveReschedule}
                    disabled={
                      !selectedSlotId ||
                      updateState.isLoading ||
                      slotsQuery.isFetching
                    }
                  />
                </View>
              </View>
            </BottomSheet>
          ) : null}
          <BottomSheet
            visible={datePickerVisible}
            setVisible={setDatePickerVisible}>
            <View style={styles.datePicker}>
              <DateTimePicker
                mode="single"
                date={rescheduleDate || new Date()}
                minDate={new Date()}
                styles={dateStyles}
                onChange={({date}: {date?: DateType}) => {
                  if (date) {
                    const selected = new Date(String(date));
                    setRescheduleDate(
                      `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`,
                    );
                    setSelectedSlotId('');
                    setRescheduleError('');
                  }
                }}
              />
              <ActionButton
                title="Done"
                onPress={() => setDatePickerVisible(false)}
              />
            </View>
          </BottomSheet>
        </>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
  },
  heroDecoration: {
    position: 'absolute',
    top: -66,
    right: -44,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroEyebrow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  heroEyebrowText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#B5E4E2',
  },
  heroTitle: {fontSize: 23, fontWeight: '800', color: colors.white},
  heroSubtitle: {
    marginTop: -4,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.78)',
  },
  bookButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  bookButtonText: {flex: 1, fontSize: 14, fontWeight: '800', color: colors.primaryDark},
  heroButtonPressed: {opacity: 0.8},
  assetsButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    backgroundColor: colors.white,
    shadowColor: '#173044',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  assetsButtonPressed: {opacity: 0.8},
  assetsIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  assetsCopy: {flex: 1, gap: 3},
  assetsTitle: {fontSize: 13, fontWeight: '800', color: colors.ink},
  assetsSubtitle: {fontSize: 10, color: colors.muted},
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionCaption: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.muted,
  },
  stats: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  statTile: {
    width: '48%',
    minHeight: 78,
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIcon: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  statNumber: {fontSize: 20, fontWeight: '900', color: colors.ink},
  statLabel: {fontSize: 11, fontWeight: '600', color: colors.muted},
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  upcomingHeading: {gap: 3},
  sectionTitle: {fontSize: 18, fontWeight: '800', color: colors.ink},
  viewAllButton: {flexDirection: 'row', alignItems: 'center', gap: 5},
  link: {fontSize: 13, fontWeight: '700', color: colors.primary},
  emptyCard: {alignItems: 'flex-start', borderRadius: 18},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  bookingPreview: {
    gap: 0,
    overflow: 'hidden',
    padding: 0,
    borderRadius: 19,
    borderColor: '#DCE8ED',
  },
  bookingSummary: {gap: 12, padding: 14},
  bookingCardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  bookingServiceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  bookingServiceCopy: {flex: 1, minWidth: 0, gap: 4},
  bookingCar: {fontSize: 11, color: colors.muted},
  statusBadge: {
    maxWidth: 100,
    flexShrink: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 11,
  },
  statusBadgeComplete: {backgroundColor: '#E8F5EE'},
  statusBadgeCancelled: {backgroundColor: '#FDECEA'},
  statusBadgeActive: {backgroundColor: '#EAF0FF'},
  statusBadgeUpcoming: {backgroundColor: colors.paleBlue},
  statusBadgeText: {fontSize: 10, fontWeight: '800', textAlign: 'center'},
  statusTextComplete: {color: colors.success},
  statusTextCancelled: {color: colors.danger},
  statusTextActive: {color: '#526BC4'},
  statusTextUpcoming: {color: colors.primaryDark},
  bookingMetaRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  bookingMetaIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F6F7',
  },
  bookingMetaCopy: {flex: 1, minWidth: 0, gap: 2},
  bookingMetaLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  bookingMetaValue: {fontSize: 12, fontWeight: '600', color: colors.ink},
  bookingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#FBFCFD',
  },
  bookingAmountGroup: {flex: 1, minWidth: 0, gap: 2},
  bookingAmount: {fontSize: 15, fontWeight: '900', color: colors.primaryDark},
  bookingPaymentStatus: {fontSize: 10, fontWeight: '600', color: colors.muted},
  manageLink: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: '#FBFCFD',
  },
  manageLinkText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1},
  bookingWorkStatus: {
    flexShrink: 1,
    textAlign: 'right',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F6F7',
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  emptyTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  emptyAction: {flexDirection: 'row', alignItems: 'center', gap: 7},
  emptyActionText: {fontSize: 13, fontWeight: '800', color: colors.primary},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  reschedulePanel: {
    gap: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  rescheduleScroll: {flexShrink: 1},
  rescheduleSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingTop: 12,
  },
  rescheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 15,
  },
  rescheduleHeaderCopy: {flex: 1, gap: 4},
  rescheduleEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rescheduleEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  rescheduleSubtitle: {fontSize: 12, lineHeight: 17, color: colors.muted},
  rescheduleDateCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#D5E9E9',
    borderRadius: 16,
    backgroundColor: '#F3FAFA',
  },
  rescheduleDateCardPressed: {opacity: 0.8},
  rescheduleDateIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  rescheduleDateCopy: {flex: 1, gap: 5},
  rescheduleDateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  rescheduleDateValue: {fontSize: 14, fontWeight: '800', color: colors.ink},
  rescheduleSlotsSection: {gap: 12},
  rescheduleSlotsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rescheduleSlotsHeadingCopy: {flex: 1, gap: 4},
  rescheduleSectionTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  rescheduleSectionHint: {fontSize: 11, lineHeight: 16, color: colors.muted},
  rescheduleSlotCount: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: '#E8F4F4',
  },
  rescheduleSlotCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  rescheduleMessageCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  slotList: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  rescheduleSlot: {
    width: '48%',
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  rescheduleSlotSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9F8',
  },
  rescheduleSlotPressed: {opacity: 0.8},
  rescheduleSlotIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  rescheduleSlotIconSelected: {backgroundColor: '#DFF1EF'},
  rescheduleSlotCopy: {flex: 1, minWidth: 0, gap: 3},
  rescheduleSlotTime: {fontSize: 12, fontWeight: '800', color: colors.ink},
  rescheduleSlotTimeSelected: {color: colors.primaryDark},
  rescheduleSlotEnd: {fontSize: 9, color: colors.muted},
  rescheduleEmpty: {
    alignItems: 'center',
    gap: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  rescheduleEmptyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  rescheduleEmptyTitle: {fontSize: 13, fontWeight: '800', color: colors.ink},
  rescheduleEmptyText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  rescheduleFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  photoRow: {flexDirection: 'row', gap: 10},
  carImage: {width: '100%', height: 150, borderRadius: 10, backgroundColor: colors.canvas, marginBottom: 8},
  photoItem: {flex: 1, gap: 4},
  photo: {width: '100%', height: 110, borderRadius: 8},
  photoPlaceholder: {
    height: 110,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    color: colors.muted,
    fontSize: 12,
  },
  checklistDone: {fontSize: 13, fontWeight: '700', color: colors.success},
  ratingRow: {flexDirection: 'row', gap: 6},
  ratingStar: {fontSize: 28, color: colors.primary},
  reviewForm: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE8ED',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
  },
  reviewStars: {fontSize: 24, letterSpacing: 2, color: colors.primary},
  modalTitle: {fontSize: 18, fontWeight: '800', color: colors.ink},
  detailRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E9EE',
  },
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: colors.ink,
    fontWeight: '700',
  },
  bookingDetailHero: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D5E9E9',
    borderRadius: 18,
    backgroundColor: '#F3FAFA',
  },
  bookingDetailHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingDetailHeroIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  bookingDetailHeroCopy: {flex: 1, minWidth: 0, gap: 4},
  bookingDetailHeroTitle: {fontSize: 15, fontWeight: '900', color: colors.ink},
  bookingDetailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D5E2E5',
  },
  bookingDetailHeroFooter: {flexDirection: 'row', gap: 12},
  bookingHeroMetric: {flex: 1, minWidth: 0, gap: 4},
  timezoneHint: {flexDirection: 'row', alignItems: 'center', gap: 6},
  timezoneText: {fontSize: 10, color: colors.muted},
  bookingDetailsSection: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2EAF0',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    shadowColor: '#16324A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE6EC',
  },
  bookingDetailsHeading: {fontSize: 14, fontWeight: '800', color: colors.ink},
  vehicleDetailImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  workerIdentity: {flexDirection: 'row', alignItems: 'center', gap: 10},
  workerAvatar: {width: 46, height: 46, borderRadius: 23, backgroundColor: colors.canvas},
  workerAvatarPlaceholder: {alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleBlue},
  workerName: {fontSize: 14, fontWeight: '700', color: colors.ink},
  timelineEntry: {
    gap: 5,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E1E9EE',
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  timelineTitle: {fontSize: 12, fontWeight: '800', color: colors.ink},
  datePicker: {backgroundColor: colors.white, padding: 18, borderRadius: 16, gap: 12},
});

export default CustomerHomeScreen;

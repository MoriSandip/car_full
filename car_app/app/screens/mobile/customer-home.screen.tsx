import React, {useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
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
  InfoMessage,
  LoadingMessage,
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
          <Text style={styles.assetsTitle}>Set up home & cars</Text>
          <Text style={styles.assetsSubtitle}>
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
        <LoadingMessage text="Loading your bookings..." />
      ) : bookingsQuery.isError ? (
        <InfoMessage text="Bookings could not be loaded. Pull to refresh from My Bookings." variant="error" />
      ) : upcoming.length ? (
        upcoming.map(booking => (
          <BookingPreview key={booking._id} booking={booking} />
        ))
      ) : (
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
      <View style={styles.row}>
        <Text style={styles.cardTitle}>
          {booking.serviceNameSnapshot || 'Car wash'}
        </Text>
        <Text style={styles.status}>{booking.status}</Text>
      </View>
      <Text style={styles.body}>
        {typeof booking.carId === 'string'
          ? 'Car details unavailable'
          : [booking.carId.registrationNumber, booking.carId.make, booking.carId.model]
              .filter(Boolean)
              .join(' ')}
      </Text>
      <Text style={styles.body}>
        {new Date(booking.bookingDate).toLocaleDateString()} · {booking.bookingTime}
      </Text>
      <Text style={styles.body}>
        {booking.amountPayable === 0
          ? 'Covered by membership'
          : booking.paymentMethod === 'Cash' &&
              booking.paymentStatus !== 'Paid'
            ? `₹${booking.amountPayable} · Cash due on service day`
            : `₹${booking.amountPayable} · ${booking.paymentStatus}`}
      </Text>
      <Text style={styles.body}>
        Cleaning progress:{' '}
        {{
          NotStarted: 'Not started',
          Working: 'In progress',
          Paused: 'Paused',
          Completed: 'Completed',
        }[booking.workStatus || 'NotStarted']}
      </Text>
      <ActionButton
        title="Manage booking"
        variant="secondary"
        onPress={() => setDetailsVisible(true)}
      />
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.detailsModal}>
            <ScrollView contentContainerStyle={styles.detailsModalContent}>
              <Text style={styles.modalTitle}>Booking details & work timeline</Text>
              <Text style={styles.body}>Times shown in India time</Text>
              <DetailRow title="Booking ID" value={booking._id} />
              <DetailRow title="Service" value={booking.serviceNameSnapshot || 'Car wash'} />
              <DetailRow title="Booking status" value={booking.status} />
              <DetailRow
                title="Work status"
                value={{
                  NotStarted: 'Not started',
                  Working: 'In progress',
                  Paused: 'Paused',
                  Completed: 'Completed',
                }[booking.workStatus || 'NotStarted']}
              />
              <DetailRow
                title="Scheduled"
                value={`${new Date(booking.bookingDate).toLocaleDateString()} · ${booking.bookingTime}`}
              />
              <DetailRow
                title="Payment"
                value={`${booking.paymentType} · ${booking.paymentMethod || '—'} · ${booking.paymentStatus}`}
              />
              {booking.paymentMethod === 'Cash' ? (
                <DetailRow
                  title="Cash collection"
                  value={booking.cashCollectionStatus ||
                    (booking.paymentStatus === 'Paid' ? 'Received' : 'NotRecorded')}
                />
              ) : null}
              <DetailRow
                title="Amount"
                value={booking.amountPayable === 0 ? 'Covered by membership' : `₹${booking.amountPayable}`}
              />
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
              <View style={styles.checklist}>
                <Text style={styles.body}>Cleaning checklist</Text>
                {[
                  ['Exterior wash', 'exteriorWash'],
                  ['Interior cleaning', 'interiorCleaning'],
                  ['Dashboard', 'dashboard'],
                  ['Tyre dressing', 'tyreDressing'],
                  ['Vacuum cleaning', 'vacuumCleaning'],
                ].map(([title, key]) => {
                  const done = booking.cleaningChecklist?.[
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
              <Text style={styles.body}>
                Worker notes: {booking.workerNotes || 'No worker notes'}
              </Text>
              <Text style={styles.sectionTitle}>Work timeline</Text>
              {(booking.workSessions || []).map((session, index) => (
                <View key={`${session.startedAt}-${index}`} style={styles.timelineEntry}>
                  <Text style={styles.sectionTitle}>
                    {index === 0 ? 'Work started' : 'Work resumed'}
                  </Text>
                  <Text style={styles.body}>
                    {formatTimelineTime(session.startedAt)}
                  </Text>
                  {session.endedAt ? (
                    <>
                      <Text style={styles.sectionTitle}>
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
              {booking.paymentMethod === 'Cash' &&
              booking.paymentStatus === 'Paid' &&
              (booking.cashCollectionStatus === 'Received' ||
                !booking.cashCollectionStatus) ? (
                <ActionButton
                  title={receiptState.isLoading ? 'Preparing receipt...' : 'Download cash receipt PDF'}
                  variant="secondary"
                  onPress={downloadCashReceipt}
                  disabled={receiptState.isLoading}
                />
              ) : null}
              {!booking.workSessions?.length && !booking.workCompletedAt ? (
                <Text style={styles.body}>No work sessions recorded yet.</Text>
              ) : null}
              <DetailRow
                title="Total working time"
                value={formatWorkDuration(booking.totalWorkingSeconds)}
              />
              {booking.status === 'Completed' ? (
                booking.customerRating ? (
                  <View style={styles.reviewSummary}>
                    <Text style={styles.sectionTitle}>
                      Your rating: {'★'.repeat(booking.customerRating)}
                      {'☆'.repeat(5 - booking.customerRating)}
                    </Text>
                    {booking.customerReview ? (
                      <Text style={styles.body}>{booking.customerReview}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.reviewForm}>
                    <Text style={styles.sectionTitle}>Rate this cleaning</Text>
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
            </ScrollView>
          </Card>
        </View>
      </Modal>
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
        <>
          <ActionButton
            title={rescheduling ? 'Close rescheduling' : 'Reschedule'}
            variant="secondary"
            onPress={() => {
              const date = new Date();
              setRescheduleDate(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              );
              setSelectedSlotId('');
              setRescheduleError('');
              setRescheduling(current => !current);
            }}
          />
          {rescheduling ? (
            <BottomSheet
              visible={rescheduling}
              setVisible={setRescheduling}>
              <View style={styles.rescheduleSheet}>
                <View style={styles.rescheduleHeader}>
                  <Text style={styles.modalTitle}>Update booking</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close reschedule form"
                    onPress={() => setRescheduling(false)}
                    style={styles.closeButton}>
                    <Feather name="x" size={19} color={colors.ink} />
                  </Pressable>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.reschedulePanel}>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                accessibilityRole="button">
                <TextField
                  value={rescheduleDate}
                  editable={false}
                  pointerEvents="none"
                  placeholder="Select date"
                />
              </Pressable>
              {slotsQuery.isFetching ? (
                <LoadingMessage text="Loading available slots..." />
              ) : slotsQuery.isError ? (
                <InfoMessage text="Available slots could not be loaded." variant="error" />
              ) : availableSlots.length ? (
                <View style={styles.slotList}>
                  {availableSlots.map((slot: Slot) => (
                    <ActionButton
                      key={slot._id}
                      title={`${slot.startTime} – ${slot.endTime}`}
                      variant={selectedSlotId === slot._id ? 'primary' : 'secondary'}
                      onPress={() => setSelectedSlotId(slot._id)}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.body}>No available slots for this date.</Text>
              )}
              {rescheduleError ? (
                <InfoMessage text={rescheduleError} variant="error" />
              ) : null}
              <ActionButton
                title={updateState.isLoading ? 'Saving...' : 'Save new schedule'}
                onPress={saveReschedule}
                disabled={!selectedSlotId || updateState.isLoading || slotsQuery.isFetching}
              />
            </View>
                </ScrollView>
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
    minHeight: 68,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  assetsCopy: {flex: 1, gap: 3},
  assetsTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  assetsSubtitle: {fontSize: 11, color: colors.muted},
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
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  bookingPreview: {gap: 7, borderRadius: 15, paddingVertical: 13},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1},
  status: {fontSize: 12, fontWeight: '700', color: colors.primary},
  emptyTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  emptyAction: {flexDirection: 'row', alignItems: 'center', gap: 7},
  emptyActionText: {fontSize: 13, fontWeight: '800', color: colors.primary},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  reschedulePanel: {gap: 10, padding: 16, paddingBottom: 26},
  rescheduleSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  rescheduleHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  slotList: {gap: 8},
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
  checklist: {gap: 5},
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistDone: {fontSize: 13, fontWeight: '700', color: colors.success},
  checklistPending: {fontSize: 13, color: colors.muted},
  ratingRow: {flexDirection: 'row', gap: 6},
  ratingStar: {fontSize: 28, color: colors.primary},
  reviewForm: {gap: 8},
  reviewSummary: {gap: 5},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  detailsModal: {
    maxHeight: '90%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  detailsModalContent: {gap: 10, paddingBottom: 8},
  modalTitle: {fontSize: 18, fontWeight: '800', color: colors.ink},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {flex: 1, textAlign: 'right', fontSize: 12, color: colors.ink, fontWeight: '600'},
  timelineEntry: {borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 10, gap: 2},
  datePicker: {backgroundColor: colors.white, padding: 18, borderRadius: 16, gap: 12},
});

export default CustomerHomeScreen;

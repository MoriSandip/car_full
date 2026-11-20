import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
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
import {
  useCreateCustomerBookingMutation,
  useGetAvailableSlotsQuery,
  useGetMyCarsQuery,
  useGetMyMembershipsQuery,
  useGetWashServicesQuery,
  useStartStripeBookingCheckoutMutation,
} from '../../store/customer.api';
import {Car, Membership, Slot} from '../../store/types';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';
import {savePendingStripePayment} from '../../store/pending-payment';
import {inclusiveBookingDates} from '../../utils/booking-date-range';

type Props = BottomTabScreenProps<NavigatorParamList, 'CustomerBooking'>;

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

const monthBounds = (date: Date) => ({
  from: localDate(new Date(date.getFullYear(), date.getMonth(), 1)),
  to: localDate(new Date(date.getFullYear(), date.getMonth() + 1, 1)),
});

const idOf = (value: string | {_id?: string} | undefined) =>
  typeof value === 'string' ? value : value?._id ?? '';

const errorText = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Could not create booking.';
};

const CustomerBookingScreen = ({navigation}: Props) => {
  const [serviceId, setServiceId] = useState('');
  const [carId, setCarId] = useState('');
  const [paymentType, setPaymentType] = useState<
    'Individual' | 'Membership'
  >('Individual');
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'Cash'>(
    'Stripe',
  );
  const [membershipId, setMembershipId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Record<string, Slot>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const servicesQuery = useGetWashServicesQuery();
  const carsQuery = useGetMyCarsQuery();
  const membershipsQuery = useGetMyMembershipsQuery();
  const [startCheckout] = useStartStripeBookingCheckoutMutation();
  const services = (servicesQuery.data?.data ?? []).filter(
    service => service.status === 'Active',
  );
  const cars = (carsQuery.data?.data ?? []).filter(
    car =>
      car.status === 'Active' && car.verificationStatus === 'VERIFIED',
  );
  const {from, to} = monthBounds(month);
  const availabilityFrom = startDate || from;
  const availabilityTo = endDate || startDate || to;
  const slotsQuery = useGetAvailableSlotsQuery(
    {serviceId, from: availabilityFrom, to: availabilityTo},
    {skip: !serviceId},
  );
  const slots = useMemo(
    () => slotsQuery.currentData?.data ?? [],
    [slotsQuery.currentData],
  );
  const datesWithSlots = useMemo(
    () =>
      new Set(
        slots
          .filter(slot => slot.isBooked === 'available')
          .map(slot => slot.date.slice(0, 10)),
      ),
    [slots],
  );
  const dateRange = useMemo(
    () => inclusiveBookingDates(startDate, endDate),
    [startDate, endDate],
  );
  const chosenBookings = useMemo(
    () =>
      dateRange.flatMap(date => {
        const selected = selectedSlots[date];
        const available = slots.some(
          slot =>
            slot._id === selected?._id &&
            slot.date.slice(0, 10) === date &&
            slot.isBooked === 'available',
        );
        return selected && available ? [{date, slot: selected}] : [];
      }),
    [dateRange, selectedSlots, slots],
  );
  const selectedCar = cars.find(car => car._id === carId);
  const membershipsForDates = useMemo(() => {
    if (!selectedCar || !startDate) return [];
    const membershipDates =
      chosenBookings.length > 0
        ? chosenBookings.map(booking => booking.date)
        : dateRange.length > 0
          ? dateRange
          : [startDate];

    return (membershipsQuery.data?.data ?? []).filter(
      (membership: Membership) => {
        const remaining =
          Number(membership.includedWashes ?? 0) -
          Number(membership.usedWashes ?? 0) -
          Number(membership.reservedWashes ?? 0);

        return (
          membership.status === 'Active' &&
          membership.paymentStatus === 'Paid' &&
          idOf(membership.carId) === selectedCar._id &&
          idOf(membership.societyId) === idOf(selectedCar.societyId) &&
          idOf(membership.flatId) === idOf(selectedCar.flatId) &&
          membershipDates.every(
            date =>
              date >= membership.startDate.slice(0, 10) &&
              date <= membership.endDate.slice(0, 10),
          ) &&
          remaining > 0
        );
      },
    );
  }, [
    membershipsQuery.data?.data,
    selectedCar,
    startDate,
    dateRange,
    chosenBookings,
  ]);
  const selectedMembership = membershipsForDates.find(
    membership => membership._id === membershipId,
  );
  const [createBooking, bookingState] = useCreateCustomerBookingMutation();

  const calendarCells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    return [
      ...Array.from({length: offset}, () => null),
      ...Array.from({length: dayCount}, (_, index) => index + 1),
    ];
  }, [month]);
  const today = localDate(new Date());

  const changeMonth = (direction: number) => {
    setMonth(
      current =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const handleBook = async () => {
    setError('');
    setSuccess('');
    if (!selectedCar || !serviceId || !startDate || !endDate) {
      setError('Choose an active car, service, and a start and end date.');
      return;
    }
    if (slotsQuery.isFetching) {
      setError('Wait for date-range availability to finish loading.');
      return;
    }
    if (chosenBookings.length === 0) {
      setError('Choose an available time slot for at least one date.');
      return;
    }
    if (paymentType === 'Membership' && !selectedMembership) {
      setError('Choose an eligible purchased membership for all selected dates.');
      return;
    }
    const remainingWashes = selectedMembership
      ? Number(selectedMembership.includedWashes ?? 0) -
        Number(selectedMembership.usedWashes ?? 0) -
        Number(selectedMembership.reservedWashes ?? 0)
      : 0;
    if (
      paymentType === 'Membership' &&
      remainingWashes < chosenBookings.length
    ) {
      setError(
        `This membership has ${Math.max(
          0,
          remainingWashes,
        )} washes remaining, but ${chosenBookings.length} dates are selected. Reduce the selected dates or choose another membership.`,
      );
      return;
    }
    const societyId =
      typeof selectedCar.societyId === 'string'
        ? selectedCar.societyId
        : selectedCar.societyId._id;
    const flatId =
      typeof selectedCar.flatId === 'string'
        ? selectedCar.flatId
        : selectedCar.flatId._id;
    if (!societyId || !flatId) {
      setError('Your car does not have a valid flat and society attached.');
      return;
    }

    setIsSubmitting(true);
    let createdCount = 0;
    const bookingFailures: string[] = [];
    const checkoutFailures: string[] = [];
    for (const {date, slot} of chosenBookings) {
      try {
        const created = await createBooking({
          societyId,
          flatId,
          carId: selectedCar._id,
          serviceId,
          slotId: slot._id,
          bookingDate: date,
          bookingTime: slot.startTime,
          paymentType,
          ...(paymentType === 'Individual' ? {paymentMethod} : {}),
          ...(paymentType === 'Membership' && selectedMembership
            ? {membershipId: selectedMembership._id}
            : {}),
        }).unwrap();
        createdCount += 1;
        if (
          paymentType === 'Individual' &&
          paymentMethod === 'Stripe' &&
          created.data.amountPayable > 0
        ) {
          try {
            const checkout = await startCheckout({
              bookingId: created.data._id,
            }).unwrap();
            await savePendingStripePayment({
              sessionId: checkout.data.sessionId,
              kind: 'booking',
            });
            await Linking.openURL(checkout.data.url);
          } catch {
            checkoutFailures.push(date);
          }
        }
      } catch (requestError) {
        bookingFailures.push(`${date}: ${errorText(requestError)}`);
      }
    }

    const skippedCount = dateRange.length - chosenBookings.length;
    setSuccess(
      `Booking range result: ${createdCount} created; ${skippedCount} day(s) skipped.${
        createdCount > 0 &&
        paymentType === 'Individual' &&
        paymentMethod === 'Cash'
          ? ' Pay cash to the assigned worker on each service day.'
          : ''
      }`,
    );
    if (bookingFailures.length || checkoutFailures.length) {
      setError(
        [
          bookingFailures.length
            ? `${bookingFailures.length} booking(s) failed: ${bookingFailures.join('; ')}`
            : '',
          checkoutFailures.length
            ? `Checkout could not be opened for ${checkoutFailures.join(', ')}. Retry payment from My Bookings.`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
    }
    setSelectedSlots({});
    try {
      await Promise.all([slotsQuery.refetch(), membershipsQuery.refetch()]);
    } catch {
      setError(current =>
        [
          current,
          'Bookings were processed, but availability or membership balances could not be refreshed.',
        ]
          .filter(Boolean)
          .join(' '),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <PageTitle
        title="Book a wash"
        subtitle="Choose your car and service, then select a date range and a time for each available day."
      />

      {servicesQuery.isLoading || carsQuery.isLoading ? (
        <LoadingMessage text="Loading cars and services..." />
      ) : servicesQuery.isError || carsQuery.isError ? (
        <>
          <InfoMessage text="Could not load cars or services. Check your connection and retry." variant="error" />
          <ActionButton
            title="Retry loading"
            variant="secondary"
            onPress={() => {
              servicesQuery.refetch();
              carsQuery.refetch();
            }}
          />
        </>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select your car</Text>
        {cars.length === 0 ? (
          <>
            <InfoMessage text="No verified active car is available. Register your society, flat, and car first; admin verification is required before booking." />
            <ActionButton
              title="Open my setup"
              variant="secondary"
              onPress={() => navigation.navigate('CustomerAssets')}
            />
          </>
        ) : (
          <View style={styles.choiceList}>
            {cars.map(car => (
              <ChoiceCard
                key={car._id}
                selected={carId === car._id}
                title={`${car.registrationNumber} · ${car.make} ${car.model}`}
                subtitle={entityLabel(car.flatId)}
                imageUri={car.imageUrl}
                onPress={() => {
                  setCarId(car._id);
                  setPaymentType('Individual');
                  setMembershipId('');
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Choose wash service</Text>
        {services.length === 0 && !servicesQuery.isLoading ? (
          <InfoMessage text="No active wash services are available right now." />
        ) : (
          <View style={styles.choiceList}>
            {services.map(service => (
              <ChoiceCard
                key={service._id}
                selected={serviceId === service._id}
                title={service.name}
                subtitle={`${service.durationMinutes} min · ₹${service.price}`}
                onPress={() => {
                  setServiceId(service._id);
                  setStartDate('');
                  setEndDate('');
                  setSelectedSlots({});
                  setPaymentType('Individual');
                  setMembershipId('');
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <Text style={styles.sectionTitle}>3. Select a date range</Text>
          {slotsQuery.isFetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
        <Card>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => changeMonth(-1)}
              style={styles.monthArrow}>
              <Text style={styles.monthArrowText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => changeMonth(1)}
              style={styles.monthArrow}>
              <Text style={styles.monthArrowText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>
                {day}
              </Text>
            ))}
            {calendarCells.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const date = localDate(
                new Date(month.getFullYear(), month.getMonth(), day),
              );
              const isPast = date < today;
              const isRangeEndpoint = date === startDate || date === endDate;
              const isInRange =
                Boolean(endDate) && date > startDate && date < endDate;
              const hasSlots = datesWithSlots.has(date);
              const enabled = Boolean(serviceId) && !isPast;
              return (
                <Pressable
                  key={date}
                  disabled={!enabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${hasSlots ? ', slots available' : ''}`}
                  accessibilityState={{
                    selected: isRangeEndpoint || isInRange,
                    disabled: !enabled,
                  }}
                  onPress={() => {
                    if (!startDate || endDate) {
                      setStartDate(date);
                      setEndDate('');
                    } else if (date >= startDate) {
                      setEndDate(date);
                    } else {
                      setStartDate(date);
                      setEndDate('');
                    }
                    setSelectedSlots({});
                    setMembershipId('');
                  }}
                  style={[
                    styles.dayCell,
                    isInRange && styles.dayInRange,
                    isRangeEndpoint && styles.daySelected,
                    !enabled && styles.dayDisabled,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      isInRange && styles.dayTextInRange,
                      isRangeEndpoint && styles.dayTextSelected,
                      !enabled && styles.dayTextDisabled,
                    ]}>
                    {day}
                  </Text>
                  {hasSlots && !isRangeEndpoint && !isInRange ? (
                    <View style={styles.availableDot} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.legend}>
            Tap a start date, then an end date. Green dots indicate available slots.
          </Text>
          {startDate ? (
            <Text style={styles.rangeLabel}>
              {endDate
                ? `Selected: ${startDate} – ${endDate}`
                : `Start: ${startDate} · Choose an end date`}
            </Text>
          ) : null}
          {startDate || endDate ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStartDate('');
                setEndDate('');
                setSelectedSlots({});
                setMembershipId('');
              }}>
              <Text style={styles.clearRange}>Clear date range</Text>
            </Pressable>
          ) : null}
        </Card>
        {!serviceId ? (
          <InfoMessage text="Choose a service first to load this month's schedule." />
        ) : slotsQuery.isError ? (
          <>
            <InfoMessage text="Could not load availability. Please retry your connection." variant="error" />
            <ActionButton title="Retry availability" variant="secondary" onPress={() => slotsQuery.refetch()} />
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          4. Choose a time for each date
        </Text>
        {!startDate ? (
          <InfoMessage text="Select a start and end date in the calendar to view the range schedule." />
        ) : !endDate ? (
          <InfoMessage text="Choose an end date to load available times for every date in the range." />
        ) : slotsQuery.isFetching ? (
          <LoadingMessage text="Loading time slots for the selected date range..." />
        ) : (
          <View style={styles.dateSlotList}>
            {dateRange.map(date => {
              const availableSlots = slots
                .filter(
                  slot =>
                    slot.date.slice(0, 10) === date &&
                    slot.isBooked === 'available',
                )
                .sort((first, second) =>
                  first.startTime.localeCompare(second.startTime),
                );
              return (
                <View key={date} style={styles.dateSlotCard}>
                  <Text style={styles.dateSlotTitle}>
                    {new Date(`${date}T00:00:00`).toLocaleDateString(
                      undefined,
                      {weekday: 'short', month: 'short', day: 'numeric'},
                    )}
                  </Text>
                  {availableSlots.length === 0 ? (
                    <Text style={styles.noSlots}>
                      No available slots · this date will be skipped
                    </Text>
                  ) : (
                    <View style={styles.slotGrid}>
                      {availableSlots.map(slot => {
                        const selected =
                          selectedSlots[date]?._id === slot._id;
                        return (
                          <Pressable
                            key={slot._id}
                            accessibilityRole="button"
                            accessibilityState={{selected}}
                            onPress={() =>
                              setSelectedSlots(current => ({
                                ...current,
                                [date]: slot,
                              }))
                            }
                            style={[
                              styles.slot,
                              selected && styles.slotSelected,
                            ]}>
                            <Text
                              style={[
                                styles.slotText,
                                selected && styles.slotTextSelected,
                              ]}>
                              {slot.startTime}
                            </Text>
                            <Text
                              style={[
                                styles.slotEnd,
                                selected && styles.slotTextSelected,
                              ]}>
                              {slot.endTime}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {selectedSlots[date] && availableSlots.length > 0 ? (
                    <Text style={styles.selectedSlotLabel}>
                      Selected: {selectedSlots[date].startTime}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        {dateRange.length > 0 && !slotsQuery.isFetching ? (
          <Text style={styles.rangeSummary}>
            {chosenBookings.length} selected ·{' '}
            {dateRange.length - chosenBookings.length} day(s) will be skipped
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Booking type</Text>
        <View style={styles.choiceList}>
          <ChoiceCard
            selected={paymentType === 'Individual'}
            title="Pay for each wash"
            subtitle="Book only the dates you selected."
            onPress={() => {
              setPaymentType('Individual');
              setMembershipId('');
            }}
          />
          <ChoiceCard
            selected={paymentType === 'Membership'}
            title="Use a purchased membership"
            subtitle="One wash per selected date will be reserved."
            onPress={() => setPaymentType('Membership')}
          />
        </View>
        {paymentType === 'Membership' ? (
          membershipsQuery.isLoading ? (
            <LoadingMessage text="Loading your memberships..." />
          ) : membershipsQuery.isError ? (
            <>
              <InfoMessage
                text="Could not load memberships. Retry before using a membership wash."
                variant="error"
              />
              <ActionButton
                title="Retry memberships"
                variant="secondary"
                onPress={() => membershipsQuery.refetch()}
              />
            </>
          ) : !startDate ? (
            <InfoMessage text="Choose a date range first to check memberships valid for those dates." />
          ) : membershipsForDates.length ? (
            <View style={styles.choiceList}>
              {membershipsForDates.map(membership => (
                <ChoiceCard
                  key={membership._id}
                  selected={membershipId === membership._id}
                  title={`${entityLabel(membership.carId)} · Membership`}
                  subtitle={`${Math.max(
                    0,
                    Number(membership.includedWashes ?? 0) -
                      Number(membership.usedWashes ?? 0) -
                      Number(membership.reservedWashes ?? 0),
                  )} washes available · valid for selected dates`}
                  onPress={() => setMembershipId(membership._id)}
                />
              ))}
            </View>
          ) : (
            <InfoMessage text="No active, paid membership with enough remaining washes matches this car and the selected dates." />
          )
        ) : null}
        {paymentType === 'Individual' ? (
          <>
            <Text style={styles.sectionTitle}>6. Payment method</Text>
            <View style={styles.choiceList}>
              <ChoiceCard
                selected={paymentMethod === 'Stripe'}
                title="Pay online"
                subtitle="Complete payment securely after each booking."
                onPress={() => setPaymentMethod('Stripe')}
              />
              <ChoiceCard
                selected={paymentMethod === 'Cash'}
                title="Cash to the worker"
                subtitle="Pay the worker on the selected service date."
                onPress={() => setPaymentMethod('Cash')}
              />
            </View>
          </>
        ) : null}
      </View>

      {error ? <InfoMessage text={error} variant="error" /> : null}
      {success ? <InfoMessage text={success} variant="success" /> : null}
      <ActionButton
        title={
          bookingState.isLoading || isSubmitting
            ? 'Booking selected dates...'
            : 'Confirm range booking'
        }
        onPress={handleBook}
        disabled={bookingState.isLoading || isSubmitting}
      />
    </Page>
  );
};

const entityLabel = (value: Car['flatId']) =>
  typeof value === 'string'
    ? 'Registered flat'
    : [value.block, value.flatNumber].filter(Boolean).join(' · ') ||
      'Registered flat';

const ChoiceCard = ({
  selected,
  title,
  subtitle,
  imageUri,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  imageUri?: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{selected}}
    onPress={onPress}
    style={[styles.choice, selected && styles.choiceSelected]}>
    <View style={[styles.radio, selected && styles.radioSelected]} />
    {imageUri ? <Image source={{uri: imageUri}} style={styles.carImage} /> : null}
    <View style={styles.choiceCopy}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceSubtitle}>{subtitle}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  section: {gap: 10},
  sectionTitle: {fontSize: 16, fontWeight: '800', color: colors.ink},
  choiceList: {gap: 8},
  choice: {
    minHeight: 66,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  choiceSelected: {borderColor: colors.primary, backgroundColor: '#F0FAFA'},
  radio: {
    width: 19,
    height: 19,
    borderWidth: 1.5,
    borderColor: '#AAB8C2',
    borderRadius: 10,
  },
  radioSelected: {
    borderWidth: 6,
    borderColor: colors.primary,
  },
  choiceCopy: {flex: 1, gap: 3},
  carImage: {width: 64, height: 48, borderRadius: 8, backgroundColor: colors.canvas},
  choiceTitle: {fontSize: 14, fontWeight: '700', color: colors.ink},
  choiceSubtitle: {fontSize: 12, color: colors.muted},
  stepHeader: {flexDirection: 'row', justifyContent: 'space-between'},
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    height: 36,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F7',
  },
  monthArrowText: {fontSize: 26, color: colors.ink, lineHeight: 30},
  monthTitle: {fontSize: 16, fontWeight: '800', color: colors.ink},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  weekday: {
    width: '14.2857%',
    height: 34,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.muted,
    fontSize: 12,
  },
  dayCell: {
    position: 'relative',
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayInRange: {backgroundColor: '#D9F0EF'},
  daySelected: {backgroundColor: colors.primary},
  dayDisabled: {opacity: 0.36},
  dayText: {fontSize: 14, color: colors.ink, fontWeight: '600'},
  dayTextInRange: {color: colors.primary, fontWeight: '700'},
  dayTextSelected: {color: colors.white, fontWeight: '800'},
  dayTextDisabled: {color: colors.muted},
  availableDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#18A477',
    bottom: 3,
  },
  legend: {fontSize: 11, color: colors.muted, textAlign: 'center'},
  rangeLabel: {fontSize: 12, color: colors.ink, textAlign: 'center'},
  clearRange: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  dateSlotList: {gap: 10},
  dateSlotCard: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateSlotTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  noSlots: {fontSize: 12, color: colors.muted},
  selectedSlotLabel: {fontSize: 11, color: colors.primary, fontWeight: '700'},
  rangeSummary: {
    fontSize: 12,
    color: colors.ink,
    textAlign: 'right',
    fontWeight: '700',
  },
  slotGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  slot: {
    width: '31.5%',
    minHeight: 55,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    gap: 2,
  },
  slotSelected: {borderColor: colors.primary, backgroundColor: colors.primary},
  slotDisabled: {backgroundColor: '#EEF1F3'},
  slotText: {fontSize: 14, fontWeight: '800', color: colors.ink},
  slotEnd: {fontSize: 10, color: colors.muted},
  slotTextSelected: {color: colors.white},
  slotTextDisabled: {color: '#8797A5'},
});

export default CustomerBookingScreen;

import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  colors,
  InfoMessage,
  LoadingSkeleton,
  LoadingMessage,
  Page,
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
  const selectedService = services.find(service => service._id === serviceId);
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
      <View style={styles.bookingIntro}>
        <View style={styles.introIcon}>
          <Feather name="droplet" size={22} color={colors.white} />
        </View>
        <View style={styles.introCopy}>
          <Text style={styles.introEyebrow}>MADE FOR YOUR SCHEDULE</Text>
          <Text style={styles.introTitle}>A cleaner car, your way</Text>
          <Text style={styles.introDescription}>
            Pick a verified car, choose a wash, and book the time that suits you.
          </Text>
        </View>
      </View>

      {servicesQuery.isLoading || carsQuery.isLoading ? (
        <LoadingSkeleton rows={3} />
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
        <StepHeading step="01" title="Select your car" />
        {cars.length === 0 ? (
          <>
            <InfoMessage text="No verified active car is available. Register your society, flat, and car first; admin verification is required before booking." />
            <ActionButton
              title="Open my setup"
              variant="secondary"
              onPress={() => navigation.navigate('CustomerSociety')}
            />
          </>
        ) : (
          <SelectField
            label="Vehicle"
            placeholder="Choose a verified car"
            icon="truck"
            value={carId}
            options={cars.map(car => ({
              value: car._id,
              label: `${car.registrationNumber} · ${car.make} ${car.model}`,
              description: entityLabel(car.flatId),
            }))}
            onChange={value => {
              setCarId(value);
              setPaymentType('Individual');
              setMembershipId('');
            }}
          />
        )}
      </View>

      <View style={styles.section}>
        <StepHeading step="02" title="Choose wash service" />
        {services.length === 0 && !servicesQuery.isLoading ? (
          <InfoMessage text="No active wash services are available right now." />
        ) : (
          <SelectField
            label="Wash service"
            placeholder="Choose a service"
            icon="droplet"
            value={serviceId}
            options={services.map(service => ({
              value: service._id,
              label: service.name,
              description: `${service.durationMinutes} min · ₹${service.price}`,
            }))}
            onChange={value => {
              setServiceId(value);
              setStartDate('');
              setEndDate('');
              setSelectedSlots({});
              setPaymentType('Individual');
              setMembershipId('');
            }}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <StepHeading step="03" title="Select a date range" />
          {slotsQuery.isFetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
        <View style={styles.calendarCard}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>DATE RANGE</Text>
            <Text style={styles.fieldHint}>Required</Text>
          </View>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => changeMonth(-1)}
              style={styles.monthArrow}>
              <Feather name="chevron-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => changeMonth(1)}
              style={styles.monthArrow}>
              <Feather name="chevron-right" size={20} color={colors.ink} />
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
                return <View key={`empty-${index}`} style={styles.emptyDayCell} />;
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
            <View style={styles.rangeLabel}>
              <Feather name="calendar" size={15} color={colors.primaryDark} />
              <Text style={styles.rangeLabelText}>
              {endDate
                ? `Selected: ${startDate} – ${endDate}`
                : `Start: ${startDate} · Choose an end date`}
              </Text>
            </View>
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
        </View>
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
        <StepHeading step="04" title="Choose a time for each date" />
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
                  <View style={styles.dateSlotHeader}>
                    <View style={styles.dateSlotLabel}>
                      <Feather
                        name="calendar"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.dateSlotTitle}>
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          undefined,
                          {weekday: 'short', month: 'short', day: 'numeric'},
                        )}
                      </Text>
                    </View>
                    <View style={styles.slotCountBadge}>
                      <Text style={styles.slotCountText}>
                        {availableSlots.length}{' '}
                        {availableSlots.length === 1 ? 'time' : 'times'}
                      </Text>
                    </View>
                  </View>
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
                            accessibilityLabel={`${slot.startTime} to ${slot.endTime}`}
                            accessibilityState={{selected}}
                            onPress={() =>
                              setSelectedSlots(current => ({
                                ...current,
                                [date]: slot,
                              }))
                            }
                            style={({pressed}) => [
                              styles.slot,
                              selected && styles.slotSelected,
                              pressed && styles.slotPressed,
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
        <StepHeading step="05" title="Booking type" />
        <SelectField
          label="Payment type"
          placeholder="Choose how to book"
          icon="credit-card"
          value={paymentType}
          options={[
            {
              value: 'Individual',
              label: 'Pay for each wash',
              description: 'Book only the dates you selected.',
            },
            {
              value: 'Membership',
              label: 'Use a purchased membership',
              description: 'Reserve one wash for each selected date.',
            },
          ]}
          onChange={value => {
            if (value === 'Individual') {
              setPaymentType('Individual');
              setMembershipId('');
            } else if (value === 'Membership') {
              setPaymentType('Membership');
            }
          }}
        />
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
            <SelectField
              label="Eligible membership"
              placeholder="Choose a membership"
              icon="award"
              value={membershipId}
              options={membershipsForDates.map(membership => ({
                value: membership._id,
                label: `${entityLabel(membership.carId)} · Membership`,
                description: `${Math.max(
                  0,
                  Number(membership.includedWashes ?? 0) -
                    Number(membership.usedWashes ?? 0) -
                    Number(membership.reservedWashes ?? 0),
                )} washes available · valid for selected dates`,
              }))}
              onChange={setMembershipId}
            />
          ) : (
            <InfoMessage text="No active, paid membership with enough remaining washes matches this car and the selected dates." />
          )
        ) : null}
        {paymentType === 'Individual' ? (
          <>
            <StepHeading step="06" title="Payment method" />
            <SelectField
              label="How would you like to pay?"
              placeholder="Choose a payment method"
              icon="credit-card"
              value={paymentMethod}
              options={[
                {
                  value: 'Stripe',
                  label: 'Pay online',
                  description: 'Complete payment securely after booking.',
                },
                {
                  value: 'Cash',
                  label: 'Cash to the worker',
                  description: 'Pay on the selected service date.',
                },
              ]}
              onChange={value => {
                if (value === 'Stripe' || value === 'Cash') {
                  setPaymentMethod(value);
                }
              }}
            />
          </>
        ) : null}
      </View>

      {selectedCar && selectedService ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Feather name="clipboard" size={17} color={colors.primary} />
            </View>
            <Text style={styles.summaryTitle}>Your booking</Text>
          </View>
          <SummaryRow
            label="Vehicle"
            value={`${selectedCar.registrationNumber} · ${selectedCar.make} ${selectedCar.model}`}
          />
          <SummaryRow label="Wash" value={selectedService.name} />
          <SummaryRow
            label="Selected dates"
            value={`${chosenBookings.length} wash${chosenBookings.length === 1 ? '' : 'es'} · ${dateRange.length - chosenBookings.length} skipped`}
          />
          <SummaryRow
            label="Payment"
            value={
              paymentType === 'Membership'
                ? selectedMembership
                  ? 'Purchased membership'
                  : 'Choose a membership'
                : paymentMethod === 'Stripe'
                  ? 'Pay online'
                  : 'Cash to the worker'
            }
            last
          />
        </View>
      ) : null}

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

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

const SelectField = ({
  label,
  placeholder,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  icon: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  return (
    <>
      <View style={styles.selectField}>
        <Text style={styles.selectLabel}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
          accessibilityState={{expanded: visible, disabled: options.length === 0}}
          disabled={options.length === 0}
          onPress={() => setVisible(true)}
          style={({pressed}) => [
            styles.selectControl,
            visible && styles.selectControlOpen,
            pressed && styles.selectControlPressed,
            options.length === 0 && styles.selectControlDisabled,
          ]}>
          <View style={styles.selectIcon}>
            <Feather name={icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.selectCopy}>
            <Text
              numberOfLines={1}
              style={[
                styles.selectValue,
                !selectedOption && styles.selectPlaceholder,
              ]}>
              {selectedOption?.label ?? placeholder}
            </Text>
            {selectedOption?.description ? (
              <Text numberOfLines={1} style={styles.selectDescription}>
                {selectedOption.description}
              </Text>
            ) : null}
          </View>
          <View style={styles.selectArrow}>
            <Feather
              name={visible ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={colors.muted}
            />
          </View>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <View style={styles.selectOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close options"
            onPress={() => setVisible(false)}
            style={styles.selectBackdrop}
          />
          <View style={styles.selectSheet}>
            <View style={styles.selectSheetHeader}>
              <View style={styles.selectSheetHeading}>
                <Text style={styles.selectSheetTitle}>{label}</Text>
                <Text style={styles.selectSheetSubtitle}>
                  Choose one option
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close options"
                onPress={() => setVisible(false)}
                style={styles.selectClose}>
                <Feather name="x" size={19} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.selectOptions}
              contentContainerStyle={styles.selectOptionsContent}
              showsVerticalScrollIndicator={false}>
              {options.map(option => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                      onChange(option.value);
                      setVisible(false);
                    }}
                    style={[
                      styles.selectOption,
                      selected && styles.selectOptionSelected,
                    ]}>
                    <View style={styles.selectOptionCopy}>
                      <Text style={styles.selectOptionTitle}>
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text style={styles.selectOptionDescription}>
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    <Feather
                      name={selected ? 'check-circle' : 'circle'}
                      size={20}
                      color={selected ? colors.primary : '#AAB8C2'}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const StepHeading = ({step, title}: {step: string; title: string}) => (
  <View style={styles.stepHeading}>
    <Text style={styles.stepNumber}>{step}</Text>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const SummaryRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  section: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E9EE',
    borderRadius: 18,
    backgroundColor: colors.white,
    shadowColor: '#173044',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  sectionTitle: {fontSize: 16, fontWeight: '800', color: colors.ink},
  stepHeading: {flexDirection: 'row', alignItems: 'center', gap: 10},
  stepNumber: {
    width: 30,
    height: 30,
    lineHeight: 30,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundColor: colors.paleBlue,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  bookingIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
  },
  introIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  introCopy: {flex: 1, gap: 3},
  introEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  introTitle: {color: colors.white, fontSize: 17, fontWeight: '800'},
  introDescription: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
  },
  selectField: {gap: 7},
  selectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  selectControl: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#D5E0E7',
    borderRadius: 15,
    backgroundColor: colors.white,
    shadowColor: '#18364A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  selectControlOpen: {borderColor: colors.primary},
  selectControlPressed: {opacity: 0.82},
  selectControlDisabled: {opacity: 0.55},
  selectIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  selectCopy: {flex: 1, gap: 3},
  selectValue: {fontSize: 14, fontWeight: '700', color: colors.ink},
  selectPlaceholder: {fontWeight: '600', color: colors.muted},
  selectDescription: {fontSize: 11, color: colors.muted},
  selectArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F2F6F8',
  },
  selectOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,35,48,0.42)',
  },
  selectBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  selectSheet: {
    maxHeight: '78%',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: colors.white,
    elevation: 12,
  },
  selectSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
  },
  selectSheetHeading: {flex: 1, gap: 4},
  selectSheetTitle: {fontSize: 19, fontWeight: '800', color: colors.ink},
  selectSheetSubtitle: {fontSize: 13, color: colors.muted},
  selectClose: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  selectOptions: {marginTop: 12},
  selectOptionsContent: {gap: 9, paddingBottom: 4},
  selectOption: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  selectOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF9F8',
  },
  selectOptionCopy: {flex: 1, gap: 4},
  selectOptionTitle: {fontSize: 14, fontWeight: '700', color: colors.ink},
  selectOptionDescription: {fontSize: 12, lineHeight: 17, color: colors.muted},
  fieldLabelRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: colors.muted,
  },
  fieldHint: {fontSize: 11, fontWeight: '700', color: colors.primary},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarCard: {
    gap: 14,
  },
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
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  monthTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  weekday: {
    width: '14.2857%',
    height: 32,
    lineHeight: 32,
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
    borderRadius: 13,
    backgroundColor: '#F6F8FA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emptyDayCell: {width: '14.2857%', height: 42},
  dayInRange: {
    backgroundColor: '#D9F0EF',
    borderColor: '#C4E8E5',
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
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
  legend: {
    paddingTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  rangeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  rangeLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
  },
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
    padding: 14,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DFE8ED',
    shadowColor: '#18364A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 1,
  },
  dateSlotHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateSlotLabel: {flexDirection: 'row', alignItems: 'center', gap: 8},
  dateSlotTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  slotCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  slotCountText: {fontSize: 10, fontWeight: '800', color: colors.primaryDark},
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
    width: '31%',
    minHeight: 62,
    borderWidth: 1.5,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFB',
    gap: 2,
    shadowColor: '#18364A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  slotSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  slotPressed: {opacity: 0.78},
  slotDisabled: {backgroundColor: '#EEF1F3'},
  slotText: {fontSize: 14, fontWeight: '800', color: colors.ink},
  slotEnd: {fontSize: 10, color: colors.muted},
  slotTextSelected: {color: colors.white},
  slotTextDisabled: {color: '#8797A5'},
  summaryCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  summaryTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  summaryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryRowLast: {borderBottomWidth: 0},
  summaryLabel: {fontSize: 12, fontWeight: '600', color: colors.muted},
  summaryValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'right',
  },
});

export default CustomerBookingScreen;

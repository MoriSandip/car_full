import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {useGetMyBookingsQuery, useGetMyCarsQuery} from '../../store/customer.api';
import {BookingPreview} from './customer-home.screen';
import {Car, RelatedEntity} from '../../store/types';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';

type Props = BottomTabScreenProps<NavigatorParamList, 'CustomerBookings'>;

const idOf = (value: RelatedEntity) =>
  typeof value === 'string' ? value : value?._id || '';

const carTitle = (car: Car) =>
  [
    car.registrationNumber,
    [car.make, car.model].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' · ') || 'My car';

const CustomerBookingsScreen = ({navigation}: Props) => {
  const {data, isLoading, isFetching, isError, refetch} =
    useGetMyBookingsQuery(undefined, {pollingInterval: 30_000});
  const carsQuery = useGetMyCarsQuery();
  const [selectedCarId, setSelectedCarId] = useState('all');
  const bookings = useMemo(() => data?.data ?? [], [data?.data]);
  const cars = carsQuery.data?.data ?? [];
  const historyBookings = useMemo(
    () =>
      selectedCarId === 'all'
        ? bookings
        : bookings.filter(booking => idOf(booking.carId) === selectedCarId),
    [bookings, selectedCarId],
  );
  const selectedCar = cars.find(car => car._id === selectedCarId);
  const activeCount = historyBookings.filter(
    booking =>
      ['Working', 'Paused'].includes(booking.workStatus || '') ||
      booking.status === 'InProgress',
  ).length;
  const completedCount = historyBookings.filter(
    booking =>
      booking.status === 'Completed' || booking.workStatus === 'Completed',
  ).length;

  return (
    <Page>
      <PageTitle
        title="My bookings"
        subtitle="Track your scheduled washes, payment and service status."
      />
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh bookings'}
        variant="secondary"
        onPress={() => refetch()}
        disabled={isFetching}
      />
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Cleaning history by car</Text>
        <View style={styles.carFilters}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{selected: selectedCarId === 'all'}}
            onPress={() => setSelectedCarId('all')}
            style={[
              styles.carFilter,
              selectedCarId === 'all' && styles.carFilterSelected,
            ]}>
            <Text
              style={[
                styles.carFilterText,
                selectedCarId === 'all' && styles.carFilterTextSelected,
              ]}>
              All cars ({bookings.length})
            </Text>
          </Pressable>
          {cars.map(car => {
            const selected = selectedCarId === car._id;
            const count = bookings.filter(
              booking => idOf(booking.carId) === car._id,
            ).length;
            return (
              <Pressable
                key={car._id}
                accessibilityRole="button"
                accessibilityState={{selected}}
                onPress={() => setSelectedCarId(car._id)}
                style={[styles.carFilter, selected && styles.carFilterSelected]}>
                <Text
                  style={[
                    styles.carFilterText,
                    selected && styles.carFilterTextSelected,
                  ]}>
                  {carTitle(car)} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedCar ? (
          <Card style={styles.carSummary}>
            <Text style={styles.summaryTitle}>{carTitle(selectedCar)}</Text>
            <Text style={styles.emptyCopy}>
              {historyBookings.length} washes · {activeCount} in progress ·{' '}
              {completedCount} completed
            </Text>
            {historyBookings[0] ? (
              <Text style={styles.emptyCopy}>
                Latest wash: {historyBookings[0].serviceNameSnapshot} ·{' '}
                {historyBookings[0].workStatus || historyBookings[0].status}
              </Text>
            ) : (
              <Text style={styles.emptyCopy}>No wash history for this car yet.</Text>
            )}
          </Card>
        ) : null}
      </View>
      {isLoading ? (
        <LoadingMessage text="Loading your bookings..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load your bookings. Please retry."
          variant="error"
        />
      ) : bookings.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyCopy}>
            Your car wash appointments will appear here.
          </Text>
          <ActionButton
            title="Book a wash"
            onPress={() => navigation.navigate('CustomerBooking')}
          />
        </Card>
      ) : historyBookings.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No washes for this car yet</Text>
          <Text style={styles.emptyCopy}>
            Once a wash is booked, its status and cleaning history will appear here.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {historyBookings.map(booking => (
            <BookingPreview key={booking._id} booking={booking} />
          ))}
        </View>
      )}
    </Page>
  );
};

const styles = StyleSheet.create({
  list: {gap: 10},
  filterSection: {gap: 8},
  filterTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  carFilters: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  carFilter: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  carFilterSelected: {backgroundColor: colors.paleBlue, borderColor: colors.primary},
  carFilterText: {fontSize: 12, color: colors.muted, fontWeight: '600'},
  carFilterTextSelected: {color: colors.primary},
  carSummary: {gap: 4},
  summaryTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  emptyTitle: {fontSize: 16, fontWeight: '800', color: colors.ink},
  emptyCopy: {fontSize: 13, lineHeight: 19, color: colors.muted},
});

export default CustomerBookingsScreen;

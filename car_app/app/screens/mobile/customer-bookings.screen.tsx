import React, {useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
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
import {StackScreenProps} from '@react-navigation/stack';
import {NavigatorParamList} from '../../navigators/navigation-route';

type Props = StackScreenProps<NavigatorParamList, 'CustomerBookings'>;

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
  const {data, isLoading, isError, refetch} =
    useGetMyBookingsQuery(undefined, {pollingInterval: 30_000});
  const carsQuery = useGetMyCarsQuery();
  const [selectedCarId, setSelectedCarId] = useState('all');
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
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
  const refreshPage = () => {
    setIsPullRefreshing(true);
    setRefreshError(false);
    Promise.all([refetch(), carsQuery.refetch()])
      .then(([bookingsResult, carsResult]) => {
        setRefreshError('error' in bookingsResult || 'error' in carsResult);
      })
      .catch(() => setRefreshError(true))
      .finally(() => setIsPullRefreshing(false));
  };

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={refreshPage}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <PageTitle compact
        title="My bookings"
        subtitle="Track your scheduled washes, payment and service status."
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
            ) : null}
          </Card>
        ) : null}
      </View>
      {refreshError ? (
        <InfoMessage
          text="Some booking details could not be refreshed. Pull down to try again."
          variant="error"
        />
      ) : null}
      {isLoading ? (
        <LoadingMessage text="Loading your bookings..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load your bookings. Please retry."
          variant="error"
        />
      ) : bookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={21} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyCopy}>
            Your wash schedule is clear. Book a wash and your appointment,
            payment and cleaning updates will show up here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('CustomerMain', {screen: 'CustomerBooking'})
            }
            style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Book your first wash</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </Pressable>
        </Card>
      ) : historyBookings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="truck" size={21} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No washes for this car yet</Text>
          <Text style={styles.emptyCopy}>
            Book a wash for this vehicle to see its schedule and cleaning
            history here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('CustomerMain', {screen: 'CustomerBooking'})
            }
            style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Book a wash</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </Pressable>
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
  emptyCard: {alignItems: 'flex-start', gap: 12, borderRadius: 19},
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.paleBlue,
  },
  emptyAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  emptyActionText: {fontSize: 13, fontWeight: '800', color: colors.white},
});

export default CustomerBookingsScreen;

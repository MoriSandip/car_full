import React, { useMemo, useState } from 'react';
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
  FilterBottomSheet,
  InfoMessage,
  LoadingSkeleton,
  Page,
  SearchFilterBar,
} from '../../components/mobile/ui';
import {
  useGetMyBookingsQuery,
  useGetMyCarsQuery,
} from '../../store/customer.api';
import { BookingPreview } from './customer-home.screen';
import { Car, RelatedEntity } from '../../store/types';
import { StackScreenProps } from '@react-navigation/stack';
import { NavigatorParamList } from '../../navigators/navigation-route';

type Props = StackScreenProps<NavigatorParamList, 'CustomerBookings'>;

const idOf = (value: RelatedEntity) =>
  typeof value === 'string' ? value : value?._id || '';

const carTitle = (car: Car) =>
  [car.registrationNumber, [car.make, car.model].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ') || 'My car';

const CustomerBookingsScreen = ({ navigation }: Props) => {
  const { data, isLoading, isError, refetch } = useGetMyBookingsQuery(
    undefined,
    { pollingInterval: 30_000 },
  );
  const carsQuery = useGetMyCarsQuery();
  const [selectedCarId, setSelectedCarId] = useState('all');
  const [draftCarId, setDraftCarId] = useState(selectedCarId);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const bookings = useMemo(() => data?.data ?? [], [data?.data]);
  const cars = useMemo(
    () => carsQuery.data?.data ?? [],
    [carsQuery.data?.data],
  );
  const activeCar = cars.find(car => car._id === selectedCarId);
  const activeCarLabel =
    selectedCarId === 'all'
      ? 'All cars'
      : activeCar
      ? carTitle(activeCar)
      : 'Selected car';
  const historyBookings = useMemo(
    () =>
      selectedCarId === 'all'
        ? bookings
        : bookings.filter(booking => idOf(booking.carId) === selectedCarId),
    [bookings, selectedCarId],
  );
  const visibleBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return historyBookings;
    return historyBookings.filter(booking => {
      const car = cars.find(item => item._id === idOf(booking.carId));
      const searchableText = [
        booking.serviceNameSnapshot,
        booking.bookingDate,
        booking.bookingTime,
        booking.status,
        booking.paymentStatus,
        booking.paymentMethod,
        car ? carTitle(car) : idOf(booking.carId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(term);
    });
  }, [cars, historyBookings, search]);
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
      listData={isLoading || isError ? [] : visibleBookings}
      listKeyExtractor={booking => booking._id}
      renderListItem={({ item }) => <BookingPreview booking={item} />}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={refreshPage}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search bookings"
        filterAccessibilityLabel={`Filter bookings, currently ${activeCarLabel}`}
        hasActiveFilters={selectedCarId !== 'all'}
        onFilterPress={() => {
          setDraftCarId(selectedCarId);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>{activeCarLabel}</Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter bookings"
        subtitle="Choose which vehicle’s bookings to show"
        groups={[
          {
            key: 'car',
            title: 'Vehicle',
            value: draftCarId,
            defaultValue: 'all',
            options: [
              { label: `All cars (${bookings.length})`, value: 'all' },
              ...cars.map(car => ({
                label: `${car.registrationNumber || carTitle(car)} (${
                  bookings.filter(booking => idOf(booking.carId) === car._id)
                    .length
                })`,
                value: car._id,
              })),
            ],
            onChange: setDraftCarId,
          },
        ]}
        onApply={() => setSelectedCarId(draftCarId)}
      />
      {refreshError ? (
        <InfoMessage
          text="Some booking details could not be refreshed. Pull down to try again."
          variant="error"
        />
      ) : null}
      {isLoading ? (
        <LoadingSkeleton rows={3} />
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
              navigation.navigate('CustomerMain', { screen: 'CustomerBooking' })
            }
            style={styles.emptyAction}
          >
            <Text style={styles.emptyActionText}>Book your first wash</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </Pressable>
        </Card>
      ) : visibleBookings.length === 0 && search.trim() ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="search" size={21} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No matching bookings</Text>
          <Text style={styles.emptyCopy}>
            Try a different service, vehicle, date, or payment term.
          </Text>
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
              navigation.navigate('CustomerMain', { screen: 'CustomerBooking' })
            }
            style={styles.emptyAction}
          >
            <Text style={styles.emptyActionText}>Book a wash</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </Pressable>
        </Card>
      ) : null}
    </Page>
  );
};

const styles = StyleSheet.create({
  activeFilters: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  activeFilterLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  activeFilterChip: {
    maxWidth: '80%',
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
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  emptyCopy: { fontSize: 13, lineHeight: 19, color: colors.muted },
  emptyCard: { alignItems: 'flex-start', gap: 12, borderRadius: 19 },
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
  emptyActionText: { fontSize: 13, fontWeight: '800', color: colors.white },
});

export default CustomerBookingsScreen;

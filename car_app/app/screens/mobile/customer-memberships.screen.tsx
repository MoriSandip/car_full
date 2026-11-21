import React, { useMemo, useState } from 'react';
import {
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
  FilterBottomSheet,
  InfoMessage,
  LoadingSkeleton,
  ListItemPressable,
  Page,
  SearchFilterBar,
  TextField,
} from '../../components/mobile/ui';
import { BottomSheet } from '../../components/bottomSheet/BottomSheet';
import {
  useGetMembershipOffersQuery,
  useGetMembershipPlansQuery,
  useGetMyCarsQuery,
  useGetMyMembershipsQuery,
  usePurchaseMembershipMutation,
  useStartStripeMembershipCheckoutMutation,
} from '../../store/customer.api';
import { Membership, MembershipPlan, RelatedEntity } from '../../store/types';
import { savePendingStripePayment } from '../../store/pending-payment';

const idOf = (value: RelatedEntity | undefined) =>
  typeof value === 'string' ? value : value?._id ?? '';
const labelOf = (value: RelatedEntity | undefined) =>
  typeof value === 'string'
    ? value
    : value?.registrationNumber ?? value?.name ?? 'Car';
const errorText = (error: unknown) => {
  const value = error as { data?: { message?: string }; message?: string };
  return (
    value.data?.message || value.message || 'Request could not be completed.'
  );
};
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

const membershipStatusOptions = [
  { label: 'All memberships', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Payment pending', value: 'Pending' },
  { label: 'Expired', value: 'Expired' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const CustomerMembershipsScreen = () => {
  const [purchaseVisible, setPurchaseVisible] = useState(false);
  const [carId, setCarId] = useState('');
  const [planId, setPlanId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [startDate, setStartDate] = useState(() => localDate(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('All');
  const [draftStatus, setDraftStatus] = useState(status);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const dateStyles = useDefaultStyles();
  const carsQuery = useGetMyCarsQuery();
  const plansQuery = useGetMembershipPlansQuery();
  const offersQuery = useGetMembershipOffersQuery(planId, { skip: !planId });
  const membershipsQuery = useGetMyMembershipsQuery(undefined, {
    pollingInterval: 30_000,
  });
  const [purchase, purchaseState] = usePurchaseMembershipMutation();
  const [startCheckout, checkoutState] =
    useStartStripeMembershipCheckoutMutation();
  const cars = (carsQuery.data?.data ?? []).filter(
    car => car.status === 'Active' && car.verificationStatus === 'VERIFIED',
  );
  const plans = useMemo(
    () => plansQuery.data?.data ?? [],
    [plansQuery.data?.data],
  );
  const offers = offersQuery.data?.data ?? [];
  const selectedCar = cars.find(car => car._id === carId);
  const availablePlans = useMemo(
    () =>
      plans.filter(
        plan => idOf(plan.societyId) === idOf(selectedCar?.societyId),
      ),
    [plans, selectedCar],
  );
  const memberships = useMemo(
    () => membershipsQuery.data?.data ?? [],
    [membershipsQuery.data?.data],
  );
  const visibleMemberships = useMemo(() => {
    const term = search.trim().toLowerCase();
    return memberships.filter(membership => {
      if (status !== 'All' && membership.status !== status) return false;
      if (!term) return true;
      return [
        membership.planNameSnapshot,
        labelOf(membership.planId),
        labelOf(membership.carId),
        membership.status,
        membership.paymentStatus,
        membership.totalAmount,
        membership.startDate,
        membership.endDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [memberships, search, status]);
  const activeStatusLabel =
    membershipStatusOptions.find(option => option.value === status)?.label ??
    status;

  const pay = async (membership: Membership) => {
    try {
      const checkout = await startCheckout({
        membershipId: membership._id,
      }).unwrap();
      await savePendingStripePayment({
        sessionId: checkout.data.sessionId,
        kind: 'membership',
      });
      await Linking.openURL(checkout.data.url);
      return true;
    } catch (requestError) {
      setError(errorText(requestError));
      return false;
    }
  };

  const buy = async () => {
    if (!carId || !planId) {
      setError('Choose a verified car and membership plan.');
      return;
    }
    setError('');
    try {
      const membership = await purchase({
        carId,
        planId,
        ...(offerId ? { offerId } : {}),
        startDate,
      }).unwrap();
      if (membership.data.paymentStatus === 'Paid') {
        membershipsQuery.refetch();
        setPurchaseVisible(false);
      } else {
        const checkoutOpened = await pay(membership.data);
        if (checkoutOpened) setPurchaseVisible(false);
      }
      membershipsQuery.refetch();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  return (
    <Page
      listData={
        membershipsQuery.isLoading || membershipsQuery.isError
          ? []
          : visibleMemberships
      }
      listKeyExtractor={membership => membership._id}
      renderListItem={({ item: membership }) => (
        <MembershipHistoryCard
          membership={membership}
          onPay={() => pay(membership)}
          paymentError={error}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={membershipsQuery.isFetching}
          onRefresh={() => {
            membershipsQuery.refetch();
          }}
          tintColor={colors.primary}
        />
      }
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Purchase membership"
          onPress={() => {
            setError('');
            setPurchaseVisible(true);
          }}
          style={styles.addButton}
        >
          <Feather name="plus" size={21} color={colors.white} />
        </Pressable>
      }
    >
      {!purchaseVisible && error ? (
        <InfoMessage text={error} variant="error" />
      ) : null}
      <BottomSheet visible={purchaseVisible} setVisible={setPurchaseVisible}>
        <View style={styles.formSheet}>
          <View style={styles.formSheetHeader}>
            <Text style={styles.formSheetTitle}>Purchase a membership</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close form"
              onPress={() => setPurchaseVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={19} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.formSheetScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.formSheetContent}
          >
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <Card style={styles.purchaseCard}>
              <View style={styles.purchaseHeading}>
                <View style={styles.purchaseIcon}>
                  <Feather
                    name="shopping-bag"
                    size={17}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>Purchase a membership</Text>
              </View>
              <Text style={styles.label}>Verified car</Text>
              <View style={styles.choices}>
                {cars.map(car => (
                  <Pressable
                    key={car._id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: carId === car._id }}
                    onPress={() => {
                      setCarId(car._id);
                      setPlanId('');
                      setOfferId('');
                    }}
                    style={[
                      styles.carOption,
                      carId === car._id && styles.carOptionSelected,
                    ]}
                  >
                    <View style={styles.carOptionIcon}>
                      <Feather
                        name="truck"
                        size={16}
                        color={
                          carId === car._id ? colors.primary : colors.muted
                        }
                      />
                    </View>
                    <View style={styles.carOptionCopy}>
                      <Text style={styles.carOptionTitle} numberOfLines={1}>
                        {labelOf(car)}
                      </Text>
                      <Text style={styles.carOptionHint} numberOfLines={1}>
                        Verified vehicle
                      </Text>
                    </View>
                    <Feather
                      name={carId === car._id ? 'check-circle' : 'circle'}
                      size={19}
                      color={carId === car._id ? colors.primary : '#AAB8C2'}
                    />
                  </Pressable>
                ))}
                {!cars.length ? (
                  <Text style={styles.body}>
                    Add a car and wait for admin verification before buying a
                    plan.
                  </Text>
                ) : null}
              </View>
              <Text style={styles.label}>Plan</Text>
              <View style={styles.choices}>
                {availablePlans.map((plan: MembershipPlan) => (
                  <PlanOption
                    key={plan._id}
                    plan={plan}
                    selected={planId === plan._id}
                    onPress={() => {
                      setPlanId(plan._id);
                      setOfferId('');
                    }}
                  />
                ))}
                {carId && !availablePlans.length ? (
                  <Text style={styles.body}>
                    No active plans are available for this car&apos;s society.
                  </Text>
                ) : null}
              </View>
              {offers.length ? (
                <>
                  <Text style={styles.label}>Eligible offer (optional)</Text>
                  <View style={styles.choices}>
                    {offers.map(offer => (
                      <Pressable
                        key={offer._id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: offerId === offer._id }}
                        onPress={() =>
                          setOfferId(offerId === offer._id ? '' : offer._id)
                        }
                        style={[
                          styles.offerOption,
                          offerId === offer._id && styles.offerOptionSelected,
                        ]}
                      >
                        <Feather
                          name="tag"
                          size={14}
                          color={
                            offerId === offer._id
                              ? colors.primary
                              : colors.muted
                          }
                        />
                        <Text
                          style={[
                            styles.offerText,
                            offerId === offer._id && styles.offerTextSelected,
                          ]}
                          numberOfLines={2}
                        >
                          {offer.title} · {offer.discountValue}
                          {offer.discountType === 'Percentage' ? '%' : ' off'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.label}>Membership start date</Text>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                accessibilityRole="button"
              >
                <TextField
                  value={startDate}
                  editable={false}
                  pointerEvents="none"
                  placeholder="Choose a start date"
                />
              </Pressable>
              <ActionButton
                title={
                  purchaseState.isLoading || checkoutState.isLoading
                    ? 'Opening secure checkout...'
                    : 'Continue to payment'
                }
                onPress={buy}
                disabled={
                  !carId ||
                  !planId ||
                  purchaseState.isLoading ||
                  checkoutState.isLoading
                }
              />
            </Card>
          </ScrollView>
        </View>
      </BottomSheet>
      <BottomSheet
        visible={datePickerVisible}
        setVisible={setDatePickerVisible}
      >
        <View style={styles.datePicker}>
          <DateTimePicker
            mode="single"
            date={startDate || new Date()}
            minDate={new Date()}
            styles={dateStyles}
            onChange={({ date }: { date?: DateType }) => {
              if (date) setStartDate(localDate(new Date(String(date))));
            }}
          />
          <ActionButton
            title="Done"
            onPress={() => setDatePickerVisible(false)}
          />
        </View>
      </BottomSheet>

      <View style={styles.historyHeading}>
        <View style={styles.historyTitleGroup}>
          <Text style={styles.sectionTitle}>Membership history</Text>
          <Text style={styles.historySubtitle}>
            {visibleMemberships.length} of {memberships.length} memberships
          </Text>
        </View>
      </View>
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search memberships"
        filterAccessibilityLabel={`Filter memberships, currently ${activeStatusLabel}`}
        hasActiveFilters={status !== 'All'}
        onFilterPress={() => {
          setDraftStatus(status);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>{activeStatusLabel}</Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter memberships"
        subtitle="Choose which membership statuses to show"
        groups={[
          {
            key: 'membershipStatus',
            title: 'Membership status',
            value: draftStatus,
            defaultValue: 'All',
            options: membershipStatusOptions,
            onChange: setDraftStatus,
          },
        ]}
        onApply={() => setStatus(draftStatus)}
      />
      {membershipsQuery.isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : membershipsQuery.isError ? (
        <InfoMessage
          text="Memberships could not be loaded. Please retry."
          variant="error"
        />
      ) : visibleMemberships.length ? null : memberships.length ? (
        <Card style={styles.membershipEmpty}>
          <View style={styles.emptyIcon}>
            <Feather name="filter" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>No matching memberships</Text>
          <Text style={styles.body}>
            Try a different search or status filter to see more memberships.
          </Text>
        </Card>
      ) : (
        <Card style={styles.membershipEmpty}>
          <View style={styles.emptyIcon}>
            <Feather name="award" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>No memberships yet</Text>
          <Text style={styles.body}>
            Tap + to choose a verified car and plan.
          </Text>
        </Card>
      )}
    </Page>
  );
};

const PlanOption = ({
  plan,
  selected,
  onPress,
}: {
  plan: MembershipPlan;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.planOption, selected && styles.selectedPlan]}
  >
    <View style={styles.planCopy}>
      <Text style={styles.cardTitle}>{plan.name}</Text>
      <Text style={styles.body} numberOfLines={2}>
        {plan.includedWashes} washes · {plan.validityDays} days
        {plan.description ? ` · ${plan.description}` : ''}
      </Text>
    </View>
    <Text style={styles.planPrice}>₹{plan.price}</Text>
    <Feather
      name={selected ? 'check-circle' : 'circle'}
      size={19}
      color={selected ? colors.primary : '#AAB8C2'}
    />
  </Pressable>
);

const MembershipHistoryCard = ({
  membership,
  onPay,
  paymentError,
}: {
  membership: Membership;
  onPay: () => Promise<boolean>;
  paymentError: string;
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedWash, setSelectedWash] = useState<
    NonNullable<Membership['washHistory']>[number] | null
  >(null);
  const remainingWashes =
    membership.remainingWashes ??
    Math.max(
      0,
      membership.includedWashes -
        membership.usedWashes -
        membership.reservedWashes,
    );
  const completedWashes = membership.completedWashes ?? membership.usedWashes;
  const washProgress =
    membership.includedWashes > 0
      ? Math.min(
          100,
          ((completedWashes + membership.reservedWashes) /
            membership.includedWashes) *
            100,
        )
      : 0;
  const statusStyle =
    membership.status === 'Active'
      ? styles.statusActive
      : membership.status === 'Pending'
      ? styles.statusPending
      : membership.status === 'Expired'
      ? styles.statusExpired
      : styles.statusCancelled;
  const statusTextStyle =
    membership.status === 'Active'
      ? styles.statusActiveText
      : membership.status === 'Pending'
      ? styles.statusPendingText
      : membership.status === 'Expired'
      ? styles.statusExpiredText
      : styles.statusCancelledText;

  const pay = async () => {
    if (await onPay()) setDetailsVisible(false);
  };

  return (
    <>
      <ListItemPressable
        accessibilityLabel={`View ${
          membership.planNameSnapshot || 'membership'
        } details`}
        onPress={() => setDetailsVisible(true)}
      >
        <Card style={styles.membershipCard}>
          <View style={styles.membershipCardHeader}>
            <View style={styles.historyIcon}>
              <Feather name="award" size={16} color={colors.primary} />
            </View>
            <View style={styles.historyCopy}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {membership.planNameSnapshot || labelOf(membership.planId)}
              </Text>
              <Text style={styles.body} numberOfLines={1}>
                {labelOf(membership.carId)}
              </Text>
            </View>
            <View style={[styles.membershipStatus, statusStyle]}>
              <Text style={[styles.membershipStatusText, statusTextStyle]}>
                {membership.status}
              </Text>
            </View>
          </View>
          <View style={styles.washSummary}>
            <View style={styles.washSummaryCopy}>
              <Text style={styles.washSummaryCount}>{remainingWashes}</Text>
              <Text style={styles.washSummaryLabel}>washes available</Text>
            </View>
            <Text style={styles.washSummaryTotal}>
              {completedWashes + membership.reservedWashes}/
              {membership.includedWashes} used
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${washProgress}%` }]}
            />
          </View>
          <View style={styles.membershipCardFooter}>
            <View style={styles.membershipPayment}>
              <Text style={styles.membershipAmount}>
                ₹{membership.totalAmount}
              </Text>
              <Text style={styles.paymentStatusText}>
                {membership.paymentStatus}
              </Text>
            </View>
            <View style={styles.membershipValidity}>
              <Feather name="calendar" size={13} color={colors.muted} />
              <Text style={styles.membershipValidityText} numberOfLines={1}>
                Valid until {new Date(membership.endDate).toLocaleDateString()}
              </Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </View>
          </View>
        </Card>
      </ListItemPressable>
      <BottomSheet visible={detailsVisible} setVisible={setDetailsVisible}>
        <View style={styles.formSheet}>
          <View style={styles.formSheetHeader}>
            <Text style={styles.formSheetTitle}>Membership details</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close membership details"
              onPress={() => setDetailsVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={19} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.detailsScroll}
            contentContainerStyle={styles.detailsContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            automaticallyAdjustKeyboardInsets
          >
            <Card style={styles.membershipDetailHero}>
              <View style={styles.membershipCardHeader}>
                <View style={styles.detailHeroIcon}>
                  <Feather name="award" size={20} color={colors.primary} />
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.cardTitle}>
                    {membership.planNameSnapshot || labelOf(membership.planId)}
                  </Text>
                  <Text style={styles.body}>{labelOf(membership.carId)}</Text>
                </View>
                <View style={[styles.membershipStatus, statusStyle]}>
                  <Text style={[styles.membershipStatusText, statusTextStyle]}>
                    {membership.status}
                  </Text>
                </View>
              </View>
              <View style={styles.detailAmountRow}>
                <Text style={styles.membershipAmount}>
                  ₹{membership.totalAmount}
                </Text>
                <Text style={styles.paymentStatusText}>
                  {membership.paymentStatus}
                </Text>
              </View>
              <View style={styles.detailDateRow}>
                <Feather name="calendar" size={14} color={colors.primary} />
                <Text style={styles.detailDateText}>
                  {new Date(membership.startDate).toLocaleDateString()} –{' '}
                  {new Date(membership.endDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailUsage}>
                <View style={styles.detailUsageHeader}>
                  <Text style={styles.detailUsageTitle}>Wash balance</Text>
                  <Text style={styles.detailUsageCount}>
                    {remainingWashes} left
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${washProgress}%` }]}
                  />
                </View>
                <Text style={styles.detailUsageCaption}>
                  {completedWashes} completed · {membership.reservedWashes}{' '}
                  scheduled of {membership.includedWashes}
                </Text>
              </View>
            </Card>
            <Card style={styles.detailSection}>
              <View style={styles.detailSectionHeading}>
                <View style={styles.sectionIcon}>
                  <Feather
                    name="credit-card"
                    size={15}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.cardTitle}>Membership & payment</Text>
              </View>
              <MembershipDetail
                title="Payment status"
                value={membership.paymentStatus}
              />
              <MembershipDetail
                title="Validity"
                value={
                  membership.status === 'Active'
                    ? `${membership.daysRemaining ?? 0} days remaining`
                    : membership.status === 'Expired'
                    ? 'Membership expired'
                    : membership.status === 'Cancelled'
                    ? 'Membership cancelled'
                    : `Plan validity: ${membership.planValidityDays ?? 0} days`
                }
              />
              <MembershipDetail
                title={
                  membership.renewalDueSoon ? 'Renew soon' : 'Renewal date'
                }
                value={new Date(
                  membership.renewalDueDate || membership.endDate,
                ).toLocaleDateString()}
              />
              <MembershipDetail
                title="Included services"
                value={
                  membership.planServicesSnapshot?.join(', ') || 'Plan services'
                }
              />
              {paymentError ? (
                <InfoMessage text={paymentError} variant="error" />
              ) : null}
              {membership.status === 'Pending' &&
              membership.paymentStatus !== 'Paid' ? (
                <ActionButton title="Pay now" onPress={pay} />
              ) : null}
            </Card>
            <View style={styles.historySectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Daily wash history</Text>
                <Text style={styles.historySubtitle}>
                  {membership.washHistory?.length ?? 0} washes on this plan
                </Text>
              </View>
            </View>
            {membership.washHistory?.length ? (
              membership.washHistory.map(wash => (
                <ListItemPressable
                  key={wash._id}
                  accessibilityLabel={`View ${wash.serviceNameSnapshot} wash details`}
                  onPress={() => setSelectedWash(wash)}
                >
                  <Card style={styles.historyRow}>
                    <View style={styles.washHistoryHeader}>
                      <View style={styles.washHistoryIcon}>
                        <Feather
                          name="droplet"
                          size={15}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.washHistoryCopy}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {wash.serviceNameSnapshot}
                        </Text>
                        <Text style={styles.body}>
                          {new Date(wash.bookingDate).toLocaleDateString()} ·{' '}
                          {wash.bookingTime}
                        </Text>
                      </View>
                      <View style={styles.washStatusPill}>
                        <Text style={styles.washStatusText}>
                          {wash.workStatus || wash.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.washItemFooter}>
                      <Text style={styles.washItemFooterText}>
                        View wash details
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                  </Card>
                </ListItemPressable>
              ))
            ) : (
              <Card style={styles.noWashHistory}>
                <View style={styles.emptyIcon}>
                  <Feather name="calendar" size={18} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>No washes scheduled yet</Text>
                <Text style={styles.body}>
                  Scheduled washes for this membership will appear here.
                </Text>
              </Card>
            )}
          </ScrollView>
        </View>
      </BottomSheet>
      <DetailsSheet
        visible={Boolean(selectedWash)}
        setVisible={visible => !visible && setSelectedWash(null)}
        title="Wash details"
      >
        {selectedWash ? (
          <>
            <Card style={styles.washDetailHero}>
              <View style={styles.detailHeroIcon}>
                <Feather name="droplet" size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>
                {selectedWash.serviceNameSnapshot}
              </Text>
              <Text style={styles.body}>
                {new Date(selectedWash.bookingDate).toLocaleDateString()} ·{' '}
                {selectedWash.bookingTime}
              </Text>
              <View style={styles.washStatusPill}>
                <Text style={styles.washStatusText}>
                  {selectedWash.workStatus || selectedWash.status}
                </Text>
              </View>
            </Card>
            <Card style={styles.detailSection}>
              <View style={styles.detailSectionHeading}>
                <View style={styles.sectionIcon}>
                  <Feather name="activity" size={15} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Wash progress</Text>
              </View>
              <MembershipDetail
                title="Booking status"
                value={selectedWash.status}
              />
              <MembershipDetail
                title="Work status"
                value={selectedWash.workStatus || 'Not started'}
              />
              <MembershipDetail
                title="Completed"
                value={
                  selectedWash.workCompletedAt
                    ? new Date(selectedWash.workCompletedAt).toLocaleString()
                    : 'Not completed'
                }
              />
              <MembershipDetail
                title="Total work time"
                value={`${Math.floor(
                  (selectedWash.totalWorkingSeconds || 0) / 60,
                )} min`}
              />
            </Card>
          </>
        ) : null}
      </DetailsSheet>
    </>
  );
};

const MembershipDetail = ({
  title,
  value,
}: {
  title: string;
  value?: string;
}) => (
  <View style={styles.washDetail}>
    <Text style={styles.washDetailLabel}>{title}</Text>
    <Text style={styles.washDetailValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  addButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  formSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  formSheetHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  formSheetTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  formSheetContent: { gap: 12, padding: 16, paddingBottom: 28 },
  formSheetScroll: { flexShrink: 1 },
  detailsScroll: { flexShrink: 1 },
  detailsContent: { gap: 12, padding: 16, paddingBottom: 28 },
  purchaseCard: { borderRadius: 16 },
  purchaseHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  purchaseIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink },
  choices: { gap: 9 },
  carOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  carOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF9F8',
  },
  carOptionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  carOptionCopy: { flex: 1, gap: 3 },
  carOptionTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  carOptionHint: { fontSize: 11, color: colors.muted },
  offerOption: {
    maxWidth: '100%',
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  offerOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.paleBlue,
  },
  offerText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  offerTextSelected: { color: colors.primaryDark },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted },
  membershipCard: { gap: 11, borderRadius: 17, paddingVertical: 15 },
  membershipCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  washSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  washSummaryCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  washSummaryCount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  washSummaryLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  washSummaryTotal: { fontSize: 11, fontWeight: '700', color: colors.muted },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  membershipCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  membershipPayment: { gap: 1 },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'capitalize',
  },
  membershipValidity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  membershipValidityText: { flexShrink: 1, fontSize: 11, color: colors.muted },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyTitleGroup: { flex: 1, gap: 2 },
  historySubtitle: { fontSize: 11, color: colors.muted },
  activeFilters: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  activeFilterLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  activeFilterChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  historyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  historyCopy: { flex: 1, gap: 3 },
  membershipStatus: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  membershipStatusText: { fontSize: 10, fontWeight: '800' },
  statusActive: { backgroundColor: '#E8F5EE' },
  statusPending: { backgroundColor: '#FFF5DE' },
  statusExpired: { backgroundColor: colors.canvas },
  statusCancelled: { backgroundColor: '#FCE9E7' },
  statusActiveText: { color: colors.success },
  statusPendingText: { color: '#966000' },
  statusExpiredText: { color: colors.muted },
  statusCancelledText: { color: colors.danger },
  membershipAmount: { fontSize: 18, fontWeight: '900', color: colors.ink },
  membershipEmpty: { alignItems: 'flex-start', gap: 10, borderRadius: 18 },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  historyRow: { gap: 11, paddingVertical: 13, borderRadius: 15 },
  historySectionHeading: { marginTop: 4 },
  membershipDetailHero: { gap: 15, borderRadius: 18, padding: 16 },
  detailHeroIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  detailAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailDateText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  detailUsage: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  detailUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailUsageTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  detailUsageCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  detailUsageCaption: { fontSize: 11, color: colors.muted },
  detailSection: { gap: 8, borderRadius: 17 },
  detailSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  washHistoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  washHistoryIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  washHistoryCopy: { flex: 1, gap: 2 },
  washStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.paleBlue,
  },
  washStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  noWashHistory: { alignItems: 'flex-start', gap: 8, borderRadius: 16 },
  washDetailHero: { alignItems: 'flex-start', gap: 8, borderRadius: 17 },
  washItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  washItemFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  washDetail: {
    gap: 3,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  washDetailLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  washDetailValue: { fontSize: 14, lineHeight: 20, color: colors.ink },
  planOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  selectedPlan: { borderColor: colors.primary, backgroundColor: '#EFF9F8' },
  planCopy: { flex: 1, gap: 3 },
  planPrice: { fontSize: 13, fontWeight: '800', color: colors.ink },
  datePicker: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
});

export default CustomerMembershipsScreen;

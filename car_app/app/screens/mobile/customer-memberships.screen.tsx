import React, {useMemo, useState} from 'react';
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
  InfoMessage,
  LoadingMessage,
  ListItemPressable,
  Page,
  PageTitle,
  TextField,
} from '../../components/mobile/ui';
import {BottomSheet} from '../../components/bottomSheet/BottomSheet';
import {
  useGetMembershipOffersQuery,
  useGetMembershipPlansQuery,
  useGetMyCarsQuery,
  useGetMyMembershipsQuery,
  usePurchaseMembershipMutation,
  useStartStripeMembershipCheckoutMutation,
} from '../../store/customer.api';
import {Membership, MembershipPlan, RelatedEntity} from '../../store/types';
import {savePendingStripePayment} from '../../store/pending-payment';

const idOf = (value: RelatedEntity | undefined) =>
  typeof value === 'string' ? value : value?._id ?? '';
const labelOf = (value: RelatedEntity | undefined) =>
  typeof value === 'string'
    ? value
    : value?.registrationNumber ?? value?.name ?? 'Car';
const errorText = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Request could not be completed.';
};
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const CustomerMembershipsScreen = () => {
  const [purchaseVisible, setPurchaseVisible] = useState(false);
  const [carId, setCarId] = useState('');
  const [planId, setPlanId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [startDate, setStartDate] = useState(() => localDate(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState('');
  const dateStyles = useDefaultStyles();
  const carsQuery = useGetMyCarsQuery();
  const plansQuery = useGetMembershipPlansQuery();
  const offersQuery = useGetMembershipOffersQuery(planId, {skip: !planId});
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
  const memberships = membershipsQuery.data?.data ?? [];

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
        ...(offerId ? {offerId} : {}),
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
          style={styles.addButton}>
          <Feather name="plus" size={21} color={colors.white} />
        </Pressable>
      }>
      <PageTitle compact
        title="My memberships"
        subtitle="Choose a plan for your verified car. Payment activates the membership."
      />
      {!purchaseVisible && error ? <InfoMessage text={error} variant="error" /> : null}
      <BottomSheet
        visible={purchaseVisible}
        setVisible={setPurchaseVisible}>
        <View style={styles.formSheet}>
          <View style={styles.formSheetHeader}>
            <Text style={styles.formSheetTitle}>Purchase a membership</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close form"
              onPress={() => setPurchaseVisible(false)}
              style={styles.closeButton}>
              <Feather name="x" size={19} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formSheetContent}>
      {error ? <InfoMessage text={error} variant="error" /> : null}
      <Card style={styles.purchaseCard}>
        <View style={styles.purchaseHeading}>
          <View style={styles.purchaseIcon}>
            <Feather name="shopping-bag" size={17} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Purchase a membership</Text>
        </View>
        <Text style={styles.label}>Verified car</Text>
        <View style={styles.choices}>
          {cars.map(car => (
            <Pressable
              key={car._id}
              accessibilityRole="button"
              accessibilityState={{selected: carId === car._id}}
              onPress={() => {
                setCarId(car._id);
                setPlanId('');
                setOfferId('');
              }}
              style={[
                styles.carOption,
                carId === car._id && styles.carOptionSelected,
              ]}>
              <View style={styles.carOptionIcon}>
                <Feather
                  name="truck"
                  size={16}
                  color={carId === car._id ? colors.primary : colors.muted}
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
              Add a car and wait for admin verification before buying a plan.
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
            <Text style={styles.body}>No active plans are available for this car&apos;s society.</Text>
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
                  accessibilityState={{selected: offerId === offer._id}}
                  onPress={() => setOfferId(offerId === offer._id ? '' : offer._id)}
                  style={[
                    styles.offerOption,
                    offerId === offer._id && styles.offerOptionSelected,
                  ]}>
                  <Feather
                    name="tag"
                    size={14}
                    color={offerId === offer._id ? colors.primary : colors.muted}
                  />
                  <Text
                    style={[
                      styles.offerText,
                      offerId === offer._id && styles.offerTextSelected,
                    ]}
                    numberOfLines={2}>
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
          accessibilityRole="button">
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
          disabled={!carId || !planId || purchaseState.isLoading || checkoutState.isLoading}
        />
      </Card>
          </ScrollView>
        </View>
      </BottomSheet>
      <BottomSheet
        visible={datePickerVisible}
        setVisible={setDatePickerVisible}>
        <View style={styles.datePicker}>
          <DateTimePicker
            mode="single"
            date={startDate || new Date()}
            minDate={new Date()}
            styles={dateStyles}
            onChange={({date}: {date?: DateType}) => {
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
        <Text style={styles.sectionTitle}>Membership history</Text>
        <Text style={styles.membershipCount}>{memberships.length}</Text>
      </View>
      {membershipsQuery.isLoading ? (
        <LoadingMessage text="Loading your memberships..." />
      ) : membershipsQuery.isError ? (
        <InfoMessage
          text="Memberships could not be loaded. Please retry."
          variant="error"
        />
      ) : memberships.length ? (
        memberships.map(membership => (
          <MembershipHistoryCard
            key={membership._id}
            membership={membership}
            onPay={() => pay(membership)}
            paymentError={error}
          />
        ))
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
    accessibilityState={{selected}}
    onPress={onPress}
    style={[styles.planOption, selected && styles.selectedPlan]}>
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

  const pay = async () => {
    if (await onPay()) setDetailsVisible(false);
  };

  return (
    <>
      <ListItemPressable
        accessibilityLabel={`View ${membership.planNameSnapshot || 'membership'} details`}
        onPress={() => setDetailsVisible(true)}>
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
            <View style={styles.membershipStatus}>
              <Text style={styles.membershipStatusText}>{membership.status}</Text>
            </View>
          </View>
          <View style={styles.membershipSummary}>
            <Text style={styles.membershipAmount}>₹{membership.totalAmount}</Text>
            <Text style={[styles.body, styles.membershipRemaining]} numberOfLines={1}>
              {remainingWashes} washes left ·{' '}
              {new Date(membership.endDate).toLocaleDateString()}
            </Text>
            <Feather name="chevron-right" size={17} color={colors.muted} />
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
              style={styles.closeButton}>
              <Feather name="x" size={19} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.detailsContent}>
            <Card style={styles.purchaseCard}>
              <Text style={styles.cardTitle}>
                {membership.planNameSnapshot || labelOf(membership.planId)}
              </Text>
              <Text style={styles.body}>{labelOf(membership.carId)}</Text>
              <Text style={styles.membershipAmount}>₹{membership.totalAmount}</Text>
              <Text style={styles.body}>
                {new Date(membership.startDate).toLocaleDateString()} –{' '}
                {new Date(membership.endDate).toLocaleDateString()}
              </Text>
              <Text style={styles.body}>
                {membership.paymentStatus} · {membership.status} ·{' '}
                {membership.status === 'Active'
                  ? `${membership.daysRemaining ?? 0} validity days remaining`
                  : membership.status === 'Expired'
                    ? 'Membership expired'
                    : membership.status === 'Cancelled'
                      ? 'Membership cancelled'
                      : `Plan validity: ${membership.planValidityDays ?? 0} days`}
              </Text>
              <Text style={styles.body}>
                Renew by{' '}
                {new Date(
                  membership.renewalDueDate || membership.endDate,
                ).toLocaleDateString()}
                {membership.renewalDueSoon ? ' · Renewal due soon' : ''}
              </Text>
              <Text style={styles.body}>
                Services: {membership.planServicesSnapshot?.join(', ') || 'Plan services'}
              </Text>
              <Text style={styles.body}>
                Washes: {membership.completedWashes ?? membership.usedWashes} completed ·{' '}
                {membership.reservedWashes} scheduled · {remainingWashes} available of{' '}
                {membership.includedWashes}
              </Text>
              {paymentError ? (
                <InfoMessage text={paymentError} variant="error" />
              ) : null}
              {membership.status === 'Pending' &&
              membership.paymentStatus !== 'Paid' ? (
                <ActionButton title="Pay now" onPress={pay} />
              ) : null}
            </Card>
            <Text style={styles.sectionTitle}>Daily wash history</Text>
            {membership.washHistory?.length ? (
              membership.washHistory.map(wash => (
                <ListItemPressable
                  key={wash._id}
                  accessibilityLabel={`View ${wash.serviceNameSnapshot} wash details`}
                  onPress={() => setSelectedWash(wash)}>
                  <Card style={styles.historyRow}>
                    <Text style={styles.body}>
                      {new Date(wash.bookingDate).toLocaleDateString()} at{' '}
                      {wash.bookingTime} · {wash.serviceNameSnapshot}
                    </Text>
                    <Text style={styles.body}>
                      {wash.status} / {wash.workStatus || 'Not started'}
                      {wash.workCompletedAt
                        ? ` · Completed ${new Date(
                            wash.workCompletedAt,
                          ).toLocaleString()}`
                        : ''}
                    </Text>
                    <View style={styles.washItemFooter}>
                        <Text style={styles.washItemFooterText}>View wash details</Text>
                        <Feather name="chevron-right" size={16} color={colors.primary} />
                    </View>
                  </Card>
                </ListItemPressable>
              ))
            ) : (
              <Text style={styles.body}>No daily washes scheduled yet.</Text>
            )}
          </ScrollView>
        </View>
      </BottomSheet>
      <DetailsSheet
        visible={Boolean(selectedWash)}
        setVisible={visible => !visible && setSelectedWash(null)}
        title="Wash details">
        {selectedWash ? (
          <>
            <MembershipDetail
              title="Service"
              value={selectedWash.serviceNameSnapshot}
            />
            <MembershipDetail
              title="Scheduled"
              value={`${new Date(selectedWash.bookingDate).toLocaleDateString()} · ${selectedWash.bookingTime}`}
            />
            <MembershipDetail title="Booking status" value={selectedWash.status} />
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
              value={`${Math.floor((selectedWash.totalWorkingSeconds || 0) / 60)} min`}
            />
          </>
        ) : null}
      </DetailsSheet>
    </>
  );
};

const MembershipDetail = ({title, value}: {title: string; value?: string}) => (
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
  formSheetTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  formSheetContent: {gap: 12, padding: 16, paddingBottom: 28},
  detailsContent: {gap: 12, padding: 16, paddingBottom: 28},
  purchaseCard: {borderRadius: 16},
  purchaseHeading: {flexDirection: 'row', alignItems: 'center', gap: 10},
  purchaseIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  label: {fontSize: 13, fontWeight: '700', color: colors.ink},
  choices: {gap: 9},
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
  carOptionCopy: {flex: 1, gap: 3},
  carOptionTitle: {fontSize: 13, fontWeight: '700', color: colors.ink},
  carOptionHint: {fontSize: 11, color: colors.muted},
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
  offerOptionSelected: {borderColor: colors.primary, backgroundColor: colors.paleBlue},
  offerText: {flexShrink: 1, fontSize: 12, fontWeight: '600', color: colors.muted},
  offerTextSelected: {color: colors.primaryDark},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  membershipCard: {gap: 8, borderRadius: 15, paddingVertical: 13},
  membershipCardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  membershipSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  membershipRemaining: {flex: 1, textAlign: 'right'},
  historyHeading: {flexDirection: 'row', alignItems: 'center', gap: 8},
  membershipCount: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  historyIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  historyCopy: {flex: 1, gap: 3},
  membershipStatus: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#E8F5EE',
  },
  membershipStatusText: {fontSize: 10, fontWeight: '800', color: colors.success},
  membershipAmount: {fontSize: 20, fontWeight: '900', color: colors.ink},
  membershipEmpty: {alignItems: 'flex-start', gap: 10, borderRadius: 18},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  historyRow: {gap: 3, paddingVertical: 12},
  washItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  washItemFooterText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  washDetail: {gap: 3, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  washDetailLabel: {fontSize: 11, fontWeight: '600', color: colors.muted},
  washDetailValue: {fontSize: 14, lineHeight: 20, color: colors.ink},
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
  selectedPlan: {borderColor: colors.primary, backgroundColor: '#EFF9F8'},
  planCopy: {flex: 1, gap: 3},
  planPrice: {fontSize: 13, fontWeight: '800', color: colors.ink},
  datePicker: {backgroundColor: colors.white, padding: 18, borderRadius: 16, gap: 12},
});

export default CustomerMembershipsScreen;

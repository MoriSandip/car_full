import React, {useMemo, useState} from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
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
    } catch (requestError) {
      setError(errorText(requestError));
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
      } else {
        await pay(membership.data);
      }
      membershipsQuery.refetch();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  return (
    <Page>
      <PageTitle
        title="My memberships"
        subtitle="Choose a plan for your verified car. Payment activates the membership."
      />
      {error ? <InfoMessage text={error} variant="error" /> : null}
      <Card>
        <Text style={styles.sectionTitle}>Purchase a membership</Text>
        <Text style={styles.label}>Verified car</Text>
        <View style={styles.choices}>
          {cars.map(car => (
            <ActionButton
              key={car._id}
              title={labelOf(car)}
              variant={carId === car._id ? 'primary' : 'secondary'}
              onPress={() => {
                setCarId(car._id);
                setPlanId('');
                setOfferId('');
              }}
            />
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
                <ActionButton
                  key={offer._id}
                  title={`${offer.title} · ${offer.discountValue}${offer.discountType === 'Percentage' ? '%' : ' off'}`}
                  variant={offerId === offer._id ? 'primary' : 'secondary'}
                  onPress={() => setOfferId(offerId === offer._id ? '' : offer._id)}
                />
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

      <Text style={styles.sectionTitle}>Membership history</Text>
      {membershipsQuery.isLoading ? (
        <LoadingMessage text="Loading your memberships..." />
      ) : membershipsQuery.isError ? (
        <InfoMessage
          text="Memberships could not be loaded. Please retry."
          variant="error"
        />
      ) : memberships.length ? (
        memberships.map(membership => (
          <Card key={membership._id}>
            <Text style={styles.cardTitle}>
              {membership.planNameSnapshot || labelOf(membership.planId)} ·{' '}
              {labelOf(membership.carId)} · ₹{membership.totalAmount}
            </Text>
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
              {membership.reservedWashes} scheduled ·{' '}
              {membership.remainingWashes ??
                Math.max(
                  0,
                  membership.includedWashes -
                    membership.usedWashes -
                    membership.reservedWashes,
                )}{' '}
              available of {membership.includedWashes}
            </Text>
            {membership.status === 'Pending' &&
            membership.paymentStatus !== 'Paid' ? (
              <ActionButton title="Pay now" onPress={() => pay(membership)} />
            ) : null}
            <Text style={styles.historyTitle}>Daily wash history</Text>
            {membership.washHistory?.length ? (
              membership.washHistory.map(wash => (
                <View key={wash._id} style={styles.historyRow}>
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
                </View>
              ))
            ) : (
              <Text style={styles.body}>No daily washes scheduled yet.</Text>
            )}
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.body}>No memberships yet.</Text>
        </Card>
      )}
      <ActionButton
        title={membershipsQuery.isFetching ? 'Refreshing...' : 'Refresh memberships'}
        variant="secondary"
        onPress={() => membershipsQuery.refetch()}
        disabled={membershipsQuery.isFetching}
      />
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
  <Card style={selected ? styles.selectedPlan : undefined}>
    <Text style={styles.cardTitle}>{plan.name} · ₹{plan.price}</Text>
    <Text style={styles.body}>
      {plan.includedWashes} washes · {plan.validityDays} days
    </Text>
    {plan.description ? <Text style={styles.body}>{plan.description}</Text> : null}
    <ActionButton
      title={selected ? 'Selected' : 'Choose plan'}
      variant={selected ? 'primary' : 'secondary'}
      onPress={onPress}
    />
  </Card>
);

const styles = StyleSheet.create({
  sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  label: {fontSize: 13, fontWeight: '700', color: colors.ink},
  choices: {gap: 8},
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  historyTitle: {fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 8},
  historyRow: {borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2},
  selectedPlan: {borderColor: colors.primary, borderWidth: 2},
  datePicker: {backgroundColor: colors.white, padding: 18, borderRadius: 16, gap: 12},
});

export default CustomerMembershipsScreen;

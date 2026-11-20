import React from 'react';
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
import {useGetWorkerDashboardQuery} from '../../store/worker.api';
import {useAppSelector} from '../../store/hooks';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';

type Props = BottomTabScreenProps<NavigatorParamList, 'WorkerDashboard'>;

const WorkerHomeScreen = ({navigation}: Props) => {
  const user = useAppSelector(state => state.auth.user);
  const {data, isLoading, isError, refetch, isFetching} =
    useGetWorkerDashboardQuery();
  const dashboard = data?.data;

  return (
    <Page>
      <PageTitle
        title={`Hello ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Here is your car wash work overview."
      />
      {isError ? (
        <InfoMessage
          text="Could not load your work dashboard."
          variant="error"
        />
      ) : null}
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh dashboard'}
        onPress={() => refetch()}
        variant="secondary"
        disabled={isFetching}
      />
      {isLoading ? (
        <LoadingMessage text="Loading your work..." />
      ) : dashboard ? (
        <View style={styles.stats}>
          <Stat title="Assigned jobs" count={dashboard.assignedBookings} />
          <Stat title="Pending" count={dashboard.pendingJobs} />
          <Stat title="Today" count={dashboard.todayJobs} />
          <Stat title="Completed" count={dashboard.completedJobs} />
        </View>
      ) : null}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent assignments</Text>
        <Pressable onPress={() => navigation.navigate('WorkerJobs')}>
          <Text style={styles.link}>All jobs</Text>
        </Pressable>
      </View>
      {dashboard?.recentBookings?.length ? (
        dashboard.recentBookings.slice(0, 4).map(job => (
          <Card key={job._id}>
            <Text style={styles.jobTitle}>
              {job.serviceNameSnapshot || 'Car wash'}
            </Text>
            <Text style={styles.copy}>
              {new Date(job.bookingDate).toLocaleDateString()} · {job.bookingTime}
            </Text>
            <Text style={styles.copy}>
              {entityLabel(job.societyId)} · {entityLabel(job.flatId)}
            </Text>
            <Text style={styles.copy}>
              {entityLabel(job.carId) || 'Car details unavailable'}
              {' · '}₹{Number(job.amountPayable ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.status}>
              {job.status} · {job.workStatus || 'Not started'}
            </Text>
          </Card>
        ))
      ) : !isLoading && !isError ? (
        <Card>
          <Text style={styles.copy}>No jobs have been assigned to you yet.</Text>
        </Card>
      ) : null}
      <ActionButton
        title="Open assigned jobs"
        onPress={() => navigation.navigate('WorkerJobs')}
      />
    </Page>
  );
};

const Stat = ({title, count}: {title: string; count: number}) => (
  <Card style={styles.stat}>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </Card>
);

const entityLabel = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as {
    name?: string;
    flatNumber?: string;
    block?: string;
    registrationNumber?: string;
    make?: string;
    model?: string;
  };
  return (
    record.name ||
    [record.registrationNumber, record.make, record.model]
      .filter(Boolean)
      .join(' ') ||
    [record.block, record.flatNumber].filter(Boolean).join(' ') ||
    ''
  );
};

const styles = StyleSheet.create({
  stats: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  stat: {width: '48%', alignItems: 'center', paddingVertical: 14},
  statCount: {fontSize: 25, fontWeight: '800', color: colors.primary},
  statTitle: {fontSize: 12, color: colors.muted, textAlign: 'center'},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  link: {fontSize: 13, fontWeight: '700', color: colors.primary},
  jobTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  copy: {fontSize: 13, color: colors.muted, lineHeight: 19},
  status: {fontSize: 12, fontWeight: '700', color: colors.primary},
});

export default WorkerHomeScreen;

import React from 'react';
import {Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
} from '../../components/mobile/ui';
import {useGetWorkerDashboardQuery} from '../../store/worker.api';
import {useAppSelector} from '../../store/hooks';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';
import Feather from 'react-native-vector-icons/Feather';

type Props = BottomTabScreenProps<NavigatorParamList, 'WorkerDashboard'>;

const WorkerHomeScreen = ({navigation}: Props) => {
  const user = useAppSelector(state => state.auth.user);
  const {data, isLoading, isError, refetch, isFetching} =
    useGetWorkerDashboardQuery();
  const dashboard = data?.data;

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <View style={styles.hero}>
        <View style={styles.heroDecoration} />
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>WORKER DASHBOARD</Text>
            <Text style={styles.heroTitle}>
              Hello {user?.name?.trim().split(/\s+/)[0] || 'there'}
            </Text>
          </View>
        </View>
        <Text style={styles.heroSubtitle}>
          Stay on top of today’s washes and your assigned jobs.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('WorkerJobs')}
          style={({pressed}) => [
            styles.jobsButton,
            pressed && styles.jobsButtonPressed,
          ]}>
          <Feather name="briefcase" size={16} color={colors.primaryDark} />
          <Text style={styles.jobsButtonText}>Open assigned jobs</Text>
          <Feather
            name="arrow-up-right"
            size={17}
            color={colors.primaryDark}
          />
        </Pressable>
      </View>
      {isError ? (
        <InfoMessage
          text="Could not load your work dashboard."
          variant="error"
        />
      ) : null}
      {isLoading ? (
        <LoadingMessage text="Loading your work..." />
      ) : dashboard ? (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Work overview</Text>
            <Text style={styles.sectionCaption}>AT A GLANCE</Text>
          </View>
          <View style={styles.stats}>
            <Stat
              title="Assigned jobs"
              count={dashboard.assignedBookings}
              icon="briefcase"
              tint="teal"
            />
            <Stat
              title="Pending"
              count={dashboard.pendingJobs}
              icon="clock"
              tint="orange"
            />
            <Stat
              title="Today"
              count={dashboard.todayJobs}
              icon="calendar"
              tint="blue"
            />
            <Stat
              title="Completed"
              count={dashboard.completedJobs}
              icon="check-circle"
              tint="green"
            />
          </View>
        </>
      ) : null}
      <View style={styles.sectionHeader}>
        <View style={styles.recentHeading}>
          <Text style={styles.sectionTitle}>Recent assignments</Text>
          <Text style={styles.sectionCaption}>LATEST JOBS</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('WorkerJobs')}
          style={styles.allJobsButton}>
          <Text style={styles.link}>All jobs</Text>
          <Feather name="arrow-right" size={15} color={colors.primary} />
        </Pressable>
      </View>
      {dashboard?.recentBookings?.length ? (
        dashboard.recentBookings.slice(0, 4).map(job => {
          const date = new Date(job.bookingDate);
          const dateLabel = Number.isNaN(date.getTime())
            ? 'Date unavailable'
            : date.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
          return (
            <Card key={job._id} style={styles.jobCard}>
              <View style={styles.jobCardHeader}>
                <View style={styles.jobIcon}>
                  <Feather name="droplet" size={18} color={colors.primary} />
                </View>
                <View style={styles.jobHeading}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {job.serviceNameSnapshot || 'Car wash'}
                  </Text>
                  <Text style={styles.jobDate}>
                    {dateLabel} · {job.bookingTime}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.status}>
                    {job.workStatus || job.status}
                  </Text>
                </View>
              </View>
              <View style={styles.jobDivider} />
              <JobDetail
                icon="map-pin"
                text={[entityLabel(job.societyId), entityLabel(job.flatId)]
                  .filter(Boolean)
                  .join(' · ') || 'Location unavailable'}
              />
              <View style={styles.jobFooter}>
                <JobDetail
                  icon="truck"
                  text={entityLabel(job.carId) || 'Car details unavailable'}
                />
                <Text style={styles.jobAmount}>
                  ₹{Number(job.amountPayable ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </Card>
          );
        })
      ) : !isLoading && !isError ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="briefcase" size={19} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.copy}>
            New jobs will appear here when they are assigned to you.
          </Text>
        </Card>
      ) : null}
    </Page>
  );
};

const statTints = {
  teal: {background: '#E4F3F2', foreground: '#087F8C'},
  orange: {background: '#FFF1E2', foreground: '#BE6A18'},
  blue: {background: '#EAF0FF', foreground: '#526BC4'},
  green: {background: '#E7F5EE', foreground: '#19805B'},
};

const Stat = ({
  title,
  count,
  icon,
  tint,
}: {
  title: string;
  count: number;
  icon: string;
  tint: keyof typeof statTints;
}) => (
  <Card style={styles.stat}>
    <View style={styles.statTop}>
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
      <Text style={styles.statCount}>{count}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
  </Card>
);

const JobDetail = ({icon, text}: {icon: string; text: string}) => (
  <View style={styles.jobDetail}>
    <Feather name={icon} size={14} color={colors.muted} />
    <Text style={styles.copy} numberOfLines={1}>
      {text}
    </Text>
  </View>
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
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
  },
  heroDecoration: {
    position: 'absolute',
    top: -62,
    right: -40,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {flex: 1, gap: 5},
  heroEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#B5E4E2',
  },
  heroTitle: {fontSize: 22, fontWeight: '800', color: colors.white},
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.78)',
  },
  jobsButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  jobsButtonText: {flex: 1, fontSize: 13, fontWeight: '800', color: colors.primaryDark},
  jobsButtonPressed: {opacity: 0.8},
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
  stat: {
    width: '48%',
    minHeight: 78,
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
  },
  statTop: {
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
  statCount: {fontSize: 20, fontWeight: '900', color: colors.ink},
  statTitle: {fontSize: 11, fontWeight: '600', color: colors.muted},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  recentHeading: {gap: 3},
  sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  allJobsButton: {flexDirection: 'row', alignItems: 'center', gap: 5},
  link: {fontSize: 13, fontWeight: '700', color: colors.primary},
  jobCard: {gap: 11, borderRadius: 18},
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  jobHeading: {flex: 1, gap: 4},
  jobTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  jobDate: {fontSize: 11, fontWeight: '600', color: colors.muted},
  statusBadge: {
    maxWidth: 105,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E8F5EE',
  },
  status: {fontSize: 10, fontWeight: '800', color: colors.success},
  jobDivider: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
  jobDetail: {flexDirection: 'row', alignItems: 'center', gap: 8},
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobAmount: {fontSize: 13, fontWeight: '800', color: colors.ink},
  copy: {flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17},
  emptyCard: {alignItems: 'flex-start', borderRadius: 18},
  emptyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  emptyTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
});

export default WorkerHomeScreen;

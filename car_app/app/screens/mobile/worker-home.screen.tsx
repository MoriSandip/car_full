import React, {useState} from 'react';
import {Image, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {
  Card,
  colors,
  DetailsSheet,
  InfoMessage,
  LoadingSkeleton,
  ListItemPressable,
  Page,
} from '../../components/mobile/ui';
import {useGetWorkerDashboardQuery} from '../../store/worker.api';
import {useAppSelector} from '../../store/hooks';
import {Booking} from '../../store/types';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NavigatorParamList} from '../../navigators/navigation-route';
import Feather from 'react-native-vector-icons/Feather';

type Props = BottomTabScreenProps<NavigatorParamList, 'WorkerDashboard'>;

const formatMoney = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const WorkerHomeScreen = ({navigation}: Props) => {
  const user = useAppSelector(state => state.auth.user);
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);
  const {data, isLoading, isError, refetch, isFetching} =
    useGetWorkerDashboardQuery();
  const dashboard = data?.data;

  return (
    <Page
      listData={
        isLoading || isError
          ? []
          : dashboard?.recentBookings?.slice(0, 4) ?? []
      }
      listKeyExtractor={job => job._id}
      renderListItem={({item: job}) => {
        const date = new Date(job.bookingDate);
        const dateLabel = Number.isNaN(date.getTime())
          ? 'Date unavailable'
          : date.toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
        return (
          <ListItemPressable
            accessibilityLabel={`View ${job.serviceNameSnapshot || 'job'} details`}
            onPress={() => setSelectedJob(job)}>
            <Card style={styles.jobCard}>
              <View style={styles.jobCardHeader}>
                <View style={styles.jobIcon}>
                  <Feather name="droplet" size={18} color={colors.primary} />
                </View>
                <View style={styles.jobHeading}>
                  <Text style={styles.jobTitle} numberOfLines={2}>
                    {job.serviceNameSnapshot || 'Car wash'}
                  </Text>
                  <Text style={styles.jobDate} numberOfLines={1}>
                    {dateLabel} · {job.bookingTime}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.status} numberOfLines={1}>
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
                <View style={styles.vehicleDetail}>
                  <JobDetail
                    icon="truck"
                    text={entityLabel(job.carId) || 'Car details unavailable'}
                  />
                </View>
                <View style={styles.amountPill}>
                  <Text style={styles.amountLabel}>BOOKING TOTAL</Text>
                  <Text
                    style={styles.jobAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}>
                    {formatMoney(job.amountPayable)}
                  </Text>
                </View>
              </View>
              <View style={styles.listItemFooter}>
                <Text style={styles.listItemFooterText}>View job details</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </View>
            </Card>
          </ListItemPressable>
        );
      }}
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
        <LoadingSkeleton rows={3} />
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
        null
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
      <DetailsSheet
        visible={Boolean(selectedJob)}
        setVisible={visible => !visible && setSelectedJob(null)}
        title="Assignment details">
        {selectedJob ? (
          <>
            <View style={styles.detailHero}>
              <View style={styles.detailHeroTop}>
                <View style={styles.detailHeroIcon}>
                  <Feather name="droplet" size={20} color={colors.white} />
                </View>
                <View style={styles.detailHeroCopy}>
                  <Text style={styles.detailEyebrow}>ASSIGNMENT</Text>
                  <Text style={styles.detailHeroTitle} numberOfLines={2}>
                    {selectedJob.serviceNameSnapshot || 'Car wash'}
                  </Text>
                  <Text style={styles.detailHeroSubtitle} numberOfLines={1}>
                    {entityLabel(selectedJob.carId) || 'Vehicle details unavailable'}
                  </Text>
                </View>
                <View style={styles.detailStatus}>
                  <Text style={styles.detailStatusText} numberOfLines={1}>
                    {selectedJob.workStatus || selectedJob.status}
                  </Text>
                </View>
              </View>
              <View style={styles.detailHeroDivider} />
              <View style={styles.detailHeroBottom}>
                <View>
                  <Text style={styles.detailAmountLabel}>BOOKING TOTAL</Text>
                  <Text
                    style={styles.detailAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}>
                    {formatMoney(selectedJob.amountPayable)}
                  </Text>
                </View>
                <View style={styles.detailSchedule}>
                  <Feather name="calendar" size={15} color="#B5E4E2" />
                  <Text style={styles.detailScheduleText}>
                    {new Date(selectedJob.bookingDate).toLocaleDateString('en-IN')} ·{' '}
                    {selectedJob.bookingTime}
                  </Text>
                </View>
              </View>
            </View>

            <DetailSection icon="clipboard" title="Booking details">
              <WorkerDetail
                title="Vehicle"
                value={entityLabel(selectedJob.carId) || 'Car details unavailable'}
              />
              <WorkerDetail
                title="Location"
                value={[entityLabel(selectedJob.societyId), entityLabel(selectedJob.flatId)]
                  .filter(Boolean)
                  .join(' · ') || 'Location unavailable'}
              />
              <WorkerDetail title="Booking status" value={selectedJob.status} />
              <WorkerDetail
                title="Work status"
                value={selectedJob.workStatus || 'Not started'}
              />
              {selectedJob.membershipId ? (
                <WorkerDetail
                  title="Membership"
                  value={
                    typeof selectedJob.membershipId === 'string'
                      ? selectedJob.membershipId
                      : selectedJob.membershipId._id || 'Membership wash'
                  }
                />
              ) : null}
            </DetailSection>

            <DetailSection icon="credit-card" title="Payment">
              <WorkerDetail title="Payment type" value={selectedJob.paymentType || '—'} />
              <WorkerDetail
                title="Method / status"
                value={`${selectedJob.paymentMethod || '—'} · ${selectedJob.paymentStatus || '—'}`}
              />
              <WorkerDetail
                title="Cash collection"
                value={selectedJob.cashCollectionStatus || '—'}
              />
            </DetailSection>

            <DetailSection icon="check-square" title="Cleaning checklist">
            {[
              {label: 'Exterior wash', checked: selectedJob.cleaningChecklist?.exteriorWash},
              {label: 'Interior cleaning', checked: selectedJob.cleaningChecklist?.interiorCleaning},
              {label: 'Dashboard', checked: selectedJob.cleaningChecklist?.dashboard},
              {label: 'Tyre dressing', checked: selectedJob.cleaningChecklist?.tyreDressing},
              {label: 'Vacuum cleaning', checked: selectedJob.cleaningChecklist?.vacuumCleaning},
            ].map(({label, checked}) => (
              <WorkerDetail
                key={label}
                title={label}
                value={checked ? 'Done' : 'Pending'}
              />
            ))}
            </DetailSection>

            {selectedJob.remarks || selectedJob.workerNotes ? (
              <DetailSection icon="file-text" title="Notes">
                {selectedJob.remarks ? (
                  <WorkerDetail title="Booking note" value={selectedJob.remarks} />
                ) : null}
                {selectedJob.workerNotes ? (
                  <WorkerDetail title="Worker notes" value={selectedJob.workerNotes} />
                ) : null}
              </DetailSection>
            ) : null}

            {selectedJob.workSessions?.length ? (
              <DetailSection icon="clock" title="Work timeline">
                {selectedJob.workSessions.map((session, index) => (
                  <WorkerDetail
                    key={`${session.startedAt}-${index}`}
                    title={index === 0 ? 'Work started' : 'Work resumed'}
                    value={`${new Date(session.startedAt).toLocaleString('en-IN')}${session.endedAt ? ` – ${new Date(session.endedAt).toLocaleString('en-IN')}` : ' · Active'}`}
                  />
                ))}
              </DetailSection>
            ) : null}
            {selectedJob.beforePhoto || selectedJob.afterPhoto ? (
              <DetailSection icon="camera" title="Cleaning photos">
                <View style={styles.photoRow}>
                  {selectedJob.beforePhoto ? (
                    <View style={styles.photoColumn}>
                      <Text style={styles.photoLabel}>BEFORE</Text>
                      <Image source={{uri: selectedJob.beforePhoto}} style={styles.photo} />
                    </View>
                  ) : null}
                  {selectedJob.afterPhoto ? (
                    <View style={styles.photoColumn}>
                      <Text style={styles.photoLabel}>AFTER</Text>
                      <Image source={{uri: selectedJob.afterPhoto}} style={styles.photo} />
                    </View>
                  ) : null}
                </View>
              </DetailSection>
            ) : null}
          </>
        ) : null}
      </DetailsSheet>
    </Page>
  );
};

const WorkerDetail = ({title, value}: {title: string; value?: string}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue} selectable>
      {value || '—'}
    </Text>
  </View>
);

const DetailSection = ({
  icon,
  title,
  children,
}: React.PropsWithChildren<{icon: string; title: string}>) => (
  <Card style={styles.detailCard}>
    <View style={styles.detailCardHeading}>
      <View style={styles.detailCardIcon}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={styles.detailCardTitle}>{title}</Text>
    </View>
    {children}
  </Card>
);

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
  jobCard: {
    gap: 11,
    padding: 14,
    borderRadius: 19,
    borderColor: '#DCE8ED',
    shadowOpacity: 0.07,
    elevation: 3,
  },
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
  jobHeading: {flex: 1, minWidth: 0, gap: 4},
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
  vehicleDetail: {flex: 1, minWidth: 0},
  amountPill: {
    maxWidth: 132,
    minWidth: 98,
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  amountLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.muted,
  },
  jobAmount: {
    maxWidth: '100%',
    fontSize: 15,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  listItemFooter: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 7,
  },
  listItemFooterText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  detailHero: {
    overflow: 'hidden',
    gap: 14,
    padding: 16,
    borderRadius: 19,
    backgroundColor: colors.primaryDark,
  },
  detailHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailHeroIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  detailHeroCopy: {flex: 1, minWidth: 0, gap: 3},
  detailEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#B5E4E2',
  },
  detailHeroTitle: {fontSize: 16, fontWeight: '800', color: colors.white},
  detailHeroSubtitle: {fontSize: 11, color: 'rgba(255,255,255,0.72)'},
  detailStatus: {
    maxWidth: 94,
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  detailStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  detailHeroDivider: {height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.24)'},
  detailHeroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailAmountLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#B5E4E2',
  },
  detailAmount: {marginTop: 2, fontSize: 21, fontWeight: '900', color: colors.white},
  detailSchedule: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  detailScheduleText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.84)',
    textAlign: 'right',
  },
  detailCard: {gap: 8, padding: 13, borderRadius: 16},
  detailCardHeading: {flexDirection: 'row', alignItems: 'center', gap: 9},
  detailCardIcon: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  detailCardTitle: {fontSize: 13, fontWeight: '800', color: colors.ink},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {
    flex: 1.25,
    minWidth: 0,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink,
    fontWeight: '600',
  },
  photoRow: {flexDirection: 'row', gap: 10},
  photoColumn: {flex: 1, minWidth: 0, gap: 5},
  photoLabel: {fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.muted},
  photo: {width: '100%', height: 130, borderRadius: 12, backgroundColor: colors.canvas},
  copy: {flex: 1, minWidth: 0, fontSize: 12, color: colors.muted, lineHeight: 17},
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

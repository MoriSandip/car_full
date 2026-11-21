import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Feather from 'react-native-vector-icons/Feather';
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
import {
  useGetAssignedBookingsQuery,
  useGetMyAttendanceQuery,
  usePerformWorkActionMutation,
  useUpdateCleaningProgressMutation,
} from '../../store/worker.api';
import {
  describeImageAsset,
  imageDataUrl,
  photoPickerOptions,
} from '../../utils/mobile-image';
import { Booking } from '../../store/types';
import {
  canPerformBookingWorkAction,
  canPerformWorkAction,
  isBookingWorkDate,
  shouldShowStartWorkAction,
  type WorkAction,
} from '../../store/worker-workflow';

const errorMessage = (error: unknown) => {
  const value = error as { data?: { message?: string }; message?: string };
  return value.data?.message || value.message || 'Unable to update this job.';
};

const SHEET_DISMISS_DELAY_MS = 350;
const statusOptions = [
  { label: 'All jobs', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'In progress', value: 'InProgress' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const statusLabel = (value: string) =>
  statusOptions.find(option => option.value === value)?.label ?? value;

const WorkerJobsScreen = () => {
  const [status, setStatus] = useState('All');
  const [draftStatus, setDraftStatus] = useState(status);
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [selectedDay, setSelectedDay] = useState<Dayjs>(() =>
    dayjs().startOf('day'),
  );
  const dayListRef = useRef<FlatList<Dayjs>>(null);
  const monthDays = useMemo(
    () =>
      Array.from(
        { length: month.add(1, 'month').diff(month, 'day') },
        (_, index) => month.add(index, 'day'),
      ),
    [month],
  );
  const selectedDayIndex = Math.max(
    0,
    monthDays.findIndex(day => day.isSame(selectedDay, 'day')),
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const {
    currentData: data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetAssignedBookingsQuery(
    {
      page: 1,
      limit: 100,
      from: month.format('YYYY-MM-DD'),
      toExclusive: month.add(1, 'month').format('YYYY-MM-DD'),
    },
    {
      pollingInterval: 30_000,
      refetchOnMountOrArgChange: true,
    },
  );
  const {
    data: attendanceResponse,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    isError: attendanceError,
  } = useGetMyAttendanceQuery();
  const [performAction, mutation] = usePerformWorkActionMutation();
  const [updateProgress, progressMutation] =
    useUpdateCleaningProgressMutation();
  const jobs = useMemo(() => data?.data ?? [], [data?.data]);
  const pendingCount = jobs.filter(job =>
    ['Pending', 'Confirmed'].includes(job.status),
  ).length;
  const completedCount = jobs.filter(job => job.status === 'Completed').length;
  const cancelledCount = jobs.filter(job => job.status === 'Cancelled').length;
  const visibleJobs = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return jobs.filter(job => {
      if (
        status !== 'All' &&
        job.status.toLowerCase() !== status.toLowerCase()
      ) {
        return false;
      }
      if (!term) return true;

      const car =
        typeof job.carId === 'string'
          ? job.carId
          : [job.carId.registrationNumber, job.carId.make, job.carId.model]
              .filter(Boolean)
              .join(' ');
      const location = [label(job.societyId), label(job.flatId)].join(' ');
      const searchableText = [
        car,
        job.serviceNameSnapshot,
        job.status,
        job.bookingTime,
        location,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [jobs, debouncedSearch, status]);
  const selectedDayJobs = useMemo(
    () =>
      visibleJobs.filter(
        job =>
          dayjs(job.bookingDate).format('YYYY-MM-DD') ===
          selectedDay.format('YYYY-MM-DD'),
      ),
    [visibleJobs, selectedDay],
  );
  const sortedSelectedDayJobs = useMemo(
    () =>
      [...selectedDayJobs].sort((left, right) => {
        const byDate = left.bookingDate.localeCompare(right.bookingDate);
        return byDate || left.bookingTime.localeCompare(right.bookingTime);
      }),
    [selectedDayJobs],
  );

  const runAction = async (
    booking: Booking,
    action: WorkAction,
    cashReceived?: boolean,
  ) => {
    setActionError('');
    if (!canPerformBookingWorkAction(booking, action, now)) {
      setActionError(
        action === 'start'
          ? 'Work can only start on the booking date.'
          : 'Work actions are only allowed on the booking date.',
      );
      return;
    }
    try {
      await performAction({
        bookingId: booking._id,
        action,
        ...(cashReceived === undefined ? {} : { cashReceived }),
      }).unwrap();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };
  const saveProgress = async (
    bookingId: string,
    progress: {
      beforePhoto?: string;
      afterPhoto?: string;
      cleaningChecklist?: NonNullable<Booking['cleaningChecklist']>;
      workerNotes?: string;
    },
  ) => {
    try {
      setActionError('');
      await updateProgress({ bookingId, progress }).unwrap();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <Page
      listData={
        isLoading || (isFetching && !data) || isError
          ? []
          : sortedSelectedDayJobs
      }
      listKeyExtractor={job => job._id}
      renderListItem={({ item: job }) => (
        <JobCard
          job={job}
          disabled={mutation.isLoading}
          now={now}
          onAction={(action, cashReceived) => {
            if (action === 'start') {
              if (attendanceLoading || attendanceFetching) {
                Alert.alert(
                  'Checking punch-in status',
                  'Please wait a moment, then try starting the task again.',
                );
                return;
              }
              if (attendanceError) {
                Alert.alert(
                  'Attendance unavailable',
                  'Your punch-in status could not be checked. Please try again.',
                );
                return;
              }
              if (!canPerformWorkAction(attendanceResponse?.data, 'start')) {
                Alert.alert(
                  'Punch-in required',
                  'Please punch in from My Attendance before starting this task.',
                );
                return;
              }
            }
            runAction(job, action, cashReceived);
          }}
          onProgress={progress => saveProgress(job._id, progress)}
          progressDisabled={progressMutation.isLoading}
          actionError={actionError}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.monthNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => {
            const previous = month.subtract(1, 'month');
            setMonth(previous);
            setSelectedDay(previous);
          }}
          style={styles.monthArrow}
        >
          <Feather name="chevron-left" size={19} color={colors.ink} />
        </Pressable>
        <Text style={styles.monthLabel}>{month.format('MMMM YYYY')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => {
            const next = month.add(1, 'month');
            setMonth(next);
            setSelectedDay(next);
          }}
          style={styles.monthArrow}
        >
          <Feather name="chevron-right" size={19} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.stats}>
        <ScheduleStat title="Assigned" value={isLoading ? '—' : jobs.length} />
        <ScheduleStat title="Pending" value={isLoading ? '—' : pendingCount} />
        <ScheduleStat title="Done" value={isLoading ? '—' : completedCount} />
        <ScheduleStat
          title="Cancelled"
          value={isLoading ? '—' : cancelledCount}
        />
      </View>
      <FlatList
        key={month.format('YYYY-MM')}
        ref={dayListRef}
        horizontal
        data={monthDays}
        initialScrollIndex={selectedDayIndex}
        getItemLayout={(_, index) => ({
          length: 72,
          offset: 72 * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          dayListRef.current?.scrollToOffset({
            offset: 72 * index,
            animated: false,
          });
        }}
        keyExtractor={day => day.format('YYYY-MM-DD')}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
        accessibilityLabel={`${month.format('MMMM YYYY')} booking dates`}
        renderItem={({ item: day }) => {
          const dayKey = day.format('YYYY-MM-DD');
          const count = jobs.filter(
            job => dayjs(job.bookingDate).format('YYYY-MM-DD') === dayKey,
          ).length;
          const selected = dayKey === selectedDay.format('YYYY-MM-DD');
          const isToday = day.isSame(dayjs(), 'day');

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isToday ? 'Today, ' : ''}${day.format(
                'dddd, D MMMM',
              )}, ${count} jobs`}
              accessibilityState={{ selected }}
              onPress={() => setSelectedDay(day)}
              style={[
                styles.day,
                isToday && styles.today,
                selected && styles.daySelected,
              ]}
            >
              <Text
                style={[styles.dayName, selected && styles.dayTextSelected]}
              >
                {isToday ? 'TODAY' : day.format('ddd')}
              </Text>
              <Text
                style={[styles.dayNumber, selected && styles.dayTextSelected]}
              >
                {day.format('D')}
              </Text>
              <Text
                style={[styles.dayCount, selected && styles.dayTextSelected]}
              >
                {count ? `${count} ${count === 1 ? 'job' : 'jobs'}` : '—'}
              </Text>
            </Pressable>
          );
        }}
      />
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search assigned jobs"
        filterAccessibilityLabel={`Filter assignments, currently ${statusLabel(
          status,
        )}`}
        hasActiveFilters={status !== 'All'}
        onFilterPress={() => {
          setDraftStatus(status);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>{statusLabel(status)}</Text>
        </View>
        {search.trim() ? (
          <Text style={styles.searchHint} numberOfLines={1}>
            Search: “{search.trim()}”
          </Text>
        ) : null}
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title="Filter assignments"
        subtitle="Choose which booking statuses to show"
        groups={[
          {
            key: 'status',
            title: 'Booking status',
            value: draftStatus,
            defaultValue: 'All',
            options: statusOptions,
            onChange: setDraftStatus,
          },
        ]}
        onApply={() => setStatus(draftStatus)}
      />
      {actionError ? <InfoMessage text={actionError} variant="error" /> : null}
      {isLoading || (isFetching && !data) ? (
        <LoadingSkeleton rows={3} />
      ) : isError ? (
        <InfoMessage
          text="Could not load assigned jobs. Please refresh."
          variant="error"
        />
      ) : visibleJobs.length === 0 ? (
        <ScheduleEmptyState
          icon={jobs.length === 0 ? 'briefcase' : 'search'}
          eyebrow={jobs.length === 0 ? month.format('MMMM YYYY') : 'NO MATCHES'}
          title={jobs.length === 0 ? 'No jobs this month' : 'No matching jobs'}
          description={
            jobs.length === 0
              ? 'Assigned washes will appear here. You can check another month using the arrows above.'
              : 'Try changing your search or selected booking status.'
          }
          actionLabel={jobs.length ? 'Clear search and filters' : undefined}
          onAction={
            jobs.length
              ? () => {
                  setSearch('');
                  setStatus('All');
                  setDraftStatus('All');
                }
              : undefined
          }
        />
      ) : selectedDayJobs.length === 0 ? (
        <ScheduleEmptyState
          icon="calendar"
          eyebrow={selectedDay.format('dddd, D MMMM')}
          title="No jobs scheduled"
          description="Pick a date with an assignment from the calendar above."
          actionLabel={
            visibleJobs.length ? 'Go to next scheduled day' : undefined
          }
          onAction={
            visibleJobs.length
              ? () => setSelectedDay(dayjs(visibleJobs[0].bookingDate))
              : undefined
          }
        />
      ) : (
        <View style={styles.dayHeading}>
          <Text style={styles.dayTitle}>
            {selectedDay.format('dddd, D MMMM')}
          </Text>
          <Text style={styles.copy}>
            {selectedDayJobs.length}{' '}
            {selectedDayJobs.length === 1 ? 'job' : 'jobs'}
          </Text>
        </View>
      )}
    </Page>
  );
};

const ScheduleStat = ({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) => (
  <View style={styles.stat}>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
);

const ScheduleEmptyState = ({
  icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <Card style={styles.emptyStateCard}>
    <View style={styles.emptyStateHeader}>
      <View style={styles.emptyStateIcon}>
        <Feather name={icon} size={21} color={colors.primary} />
      </View>
      <View style={styles.emptyStateCopy}>
        <Text style={styles.emptyStateEyebrow}>{eyebrow}</Text>
        <Text style={styles.emptyStateTitle}>{title}</Text>
      </View>
    </View>
    <Text style={styles.emptyStateDescription}>{description}</Text>
    {actionLabel && onAction ? (
      <ActionButton
        title={actionLabel}
        variant="secondary"
        onPress={onAction}
      />
    ) : null}
  </Card>
);

const JobCard = ({
  job,
  disabled,
  now,
  onAction,
  onProgress,
  progressDisabled,
  actionError,
}: {
  job: Booking;
  disabled: boolean;
  now: number;
  onAction: (action: WorkAction, cashReceived?: boolean) => void;
  onProgress: (progress: {
    beforePhoto?: string;
    afterPhoto?: string;
    cleaningChecklist?: NonNullable<Booking['cleaningChecklist']>;
    workerNotes?: string;
  }) => void;
  progressDisabled: boolean;
  actionError: string;
}) => {
  console.log('job', job);
  const [notes, setNotes] = useState(job.workerNotes || '');
  const [photoError, setPhotoError] = useState('');
  const [photoPreviews, setPhotoPreviews] = useState<{
    beforePhoto?: string;
    afterPhoto?: string;
  }>({});
  const photoPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  useEffect(
    () => () => {
      if (photoPickerTimer.current) clearTimeout(photoPickerTimer.current);
    },
    [],
  );
  const workStatus = job.workStatus || 'NotStarted';
  const isFinal = job.status === 'Completed' || job.status === 'Cancelled';
  const statusText =
    job.status === 'Cancelled'
      ? 'Cancelled'
      : workStatus === 'NotStarted'
      ? 'Not started'
      : workStatus;
  const statusBadgeTone =
    job.status === 'Cancelled'
      ? styles.jobStatusBadgeCancelled
      : workStatus === 'Completed'
      ? styles.jobStatusBadgeComplete
      : workStatus === 'Working'
      ? styles.jobStatusBadgeWorking
      : workStatus === 'Paused'
      ? styles.jobStatusBadgePaused
      : styles.jobStatusBadgeWaiting;
  const statusTextTone =
    job.status === 'Cancelled'
      ? styles.jobStatusTextCancelled
      : workStatus === 'Completed'
      ? styles.jobStatusTextComplete
      : workStatus === 'Working'
      ? styles.jobStatusTextWorking
      : workStatus === 'Paused'
      ? styles.jobStatusTextPaused
      : styles.jobStatusTextWaiting;
  const car =
    typeof job.carId === 'string'
      ? job.carId
      : `${job.carId.registrationNumber || ''} ${job.carId.make || ''} ${
          job.carId.model || ''
        }`.trim();
  const carDetails = typeof job.carId === 'string' ? null : job.carId;
  const customer = typeof job.customerId === 'string' ? null : job.customerId;
  const location = [label(job.societyId), label(job.flatId)]
    .filter(Boolean)
    .join(' · ');
  const startAllowed = canPerformBookingWorkAction(job, 'start', now);
  const otherActionsAllowed = canPerformBookingWorkAction(job, 'stop', now);
  const activeStartedAt = job.currentWorkStartedAt
    ? new Date(job.currentWorkStartedAt).getTime()
    : Number.NaN;
  const activeSeconds =
    workStatus === 'Working' && !Number.isNaN(activeStartedAt)
      ? Math.max(0, Math.floor((now - activeStartedAt) / 1000))
      : 0;
  const elapsedSeconds = (job.totalWorkingSeconds ?? 0) + activeSeconds;
  const formatTimelineTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(date);
  };
  const formatDuration = (seconds = 0) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remaining = safeSeconds % 60;
    return [hours, minutes, remaining]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  };
  const isBookingDateToday = isBookingWorkDate(job, now);
  const checklist = job.cleaningChecklist || {
    exteriorWash: false,
    interiorCleaning: false,
    dashboard: false,
    tyreDressing: false,
    vacuumCleaning: false,
  };
  const checklistItems = [
    ['exteriorWash', 'Exterior wash'],
    ['interiorCleaning', 'Interior cleaning'],
    ['dashboard', 'Dashboard'],
    ['tyreDressing', 'Tyre dressing'],
    ['vacuumCleaning', 'Vacuum cleaning'],
  ] as const;
  const canComplete =
    Boolean(job.afterPhoto) && Object.values(checklist).every(Boolean);
  const completeWork = () => {
    if (
      job.paymentType === 'Individual' &&
      job.paymentMethod === 'Cash' &&
      job.paymentStatus !== 'Paid'
    ) {
      Alert.alert(
        'Cash collection status',
        `Was ₹${Number(job.amountPayable || 0).toFixed(
          2,
        )} collected from the customer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Not received', onPress: () => onAction('done', false) },
          { text: 'Received', onPress: () => onAction('done', true) },
        ],
      );
      return;
    }
    onAction('done');
  };

  const capturePhoto = async (
    kind: 'beforePhoto' | 'afterPhoto',
    source: 'camera' | 'library',
  ) => {
    setPhotoError('');
    try {
      if (source === 'camera' && Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          setPhotoError(
            'Camera permission is required to add cleaning photos.',
          );
          return;
        }
      }
      const options = photoPickerOptions(0.5, 960);
      const result =
        source === 'camera'
          ? await launchCamera({
              ...options,
              cameraType: 'back',
              saveToPhotos: false,
            })
          : await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode || result.errorMessage) {
        setPhotoError(
          `Photo picker error (${result.errorCode || 'unknown'}): ${
            result.errorMessage || 'No additional details were returned.'
          }`,
        );
        return;
      }
      const asset = result.assets?.[0];
      if (!asset) {
        setPhotoError(describeImageAsset());
        return;
      }
      if (asset.uri) {
        setPhotoPreviews(current => ({ ...current, [kind]: asset.uri }));
      }
      const photo = imageDataUrl(asset);
      if (
        (asset.fileSize !== undefined && asset.fileSize > 2 * 1024 * 1024) ||
        photo.length > 2_800_000
      ) {
        setPhotoError('Photo is too large. Please take another photo.');
        return;
      }
      onProgress({ [kind]: photo });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Camera could not be opened.',
      );
    }
  };

  const choosePhoto = (kind: 'beforePhoto' | 'afterPhoto') => {
    const captureAfterSheetCloses = (source: 'camera' | 'library') => {
      setTimelineExpanded(false);
      photoPickerTimer.current = setTimeout(() => {
        photoPickerTimer.current = null;
        capturePhoto(kind, source).finally(() => {
          setTimelineExpanded(true);
        });
      }, SHEET_DISMISS_DELAY_MS);
    };

    Alert.alert(
      'Cleaning photo',
      'Take a photo or choose one from your gallery.',
      [
        {
          text: 'Take photo',
          onPress: () => captureAfterSheetCloses('camera'),
        },
        {
          text: 'Choose from gallery',
          onPress: () => captureAfterSheetCloses('library'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <Card style={styles.jobCard}>
      <ListItemPressable
        accessibilityLabel={`View ${job.serviceNameSnapshot || 'job'} details`}
        onPress={() => setTimelineExpanded(true)}
        style={styles.jobSummary}
      >
        <View style={styles.jobCardHeader}>
          <View style={styles.jobServiceIcon}>
            <Feather name="droplet" size={18} color={colors.primary} />
          </View>
          <View style={styles.jobServiceCopy}>
            <Text style={styles.jobServiceTitle} numberOfLines={2}>
              {job.serviceNameSnapshot || 'Car wash'}
            </Text>
            <Text style={styles.jobReference} numberOfLines={1}>
              {car || 'Car details unavailable'}
            </Text>
          </View>
          <View style={[styles.jobStatusBadge, statusBadgeTone]}>
            <Text
              style={[styles.jobStatusText, statusTextTone]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>
        </View>
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaIcon}>
            <Feather name="calendar" size={14} color={colors.primary} />
          </View>
          <View style={styles.jobMetaCopy}>
            <Text style={styles.jobMetaLabel}>SCHEDULED</Text>
            <Text style={styles.jobMetaValue} numberOfLines={1}>
              {new Date(job.bookingDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {job.bookingTime}
            </Text>
          </View>
        </View>
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaIcon}>
            <Feather name="map-pin" size={14} color={colors.primary} />
          </View>
          <View style={styles.jobMetaCopy}>
            <Text style={styles.jobMetaLabel}>LOCATION</Text>
            <Text style={styles.jobMetaValue} numberOfLines={1}>
              {location || 'Location unavailable'}
            </Text>
          </View>
        </View>
      </ListItemPressable>
      <View style={styles.jobCardFooter}>
        <View style={styles.jobAmountGroup}>
          <Text style={styles.jobAmountLabel}>BOOKING TOTAL</Text>
          <Text
            style={styles.jobAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            ₹
            {Number(job.amountPayable || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: timelineExpanded }}
          onPress={() => setTimelineExpanded(value => !value)}
          style={styles.manageButton}
        >
          <Text style={styles.timelineToggleText}>Manage job</Text>
          <Feather name="arrow-up-right" size={16} color={colors.primary} />
        </Pressable>
      </View>
      <DetailsSheet
        visible={timelineExpanded}
        setVisible={setTimelineExpanded}
        title="Job details & progress"
      >
        <View style={styles.jobDetailHero}>
          <View style={styles.jobDetailHeroHeader}>
            <View style={styles.jobDetailHeroIcon}>
              <Feather name="droplet" size={20} color={colors.primary} />
            </View>
            <View style={styles.jobDetailHeroCopy}>
              <Text style={styles.jobDetailHeroTitle} numberOfLines={2}>
                {job.serviceNameSnapshot || 'Car wash'}
              </Text>
              <Text style={styles.jobDetailHeroVehicle} numberOfLines={1}>
                {car || 'Vehicle details unavailable'}
              </Text>
            </View>
            <View style={[styles.jobStatusBadge, statusBadgeTone]}>
              <Text
                style={[styles.jobStatusText, statusTextTone]}
                numberOfLines={1}
              >
                {statusText}
              </Text>
            </View>
          </View>
          <View style={styles.jobDetailHeroDivider} />
          <View style={styles.jobDetailHeroFooter}>
            <View style={styles.jobDetailHeroMetric}>
              <Text style={styles.jobMetaLabel}>SCHEDULED</Text>
              <Text style={styles.jobMetaValue}>
                {new Date(job.bookingDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {job.bookingTime}
              </Text>
            </View>
            <View style={styles.jobDetailHeroMetric}>
              <Text style={styles.jobMetaLabel}>BOOKING TOTAL</Text>
              <Text style={styles.jobAmount}>
                ₹
                {Number(job.amountPayable || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.timezoneHint}>
          <Feather name="clock" size={13} color={colors.muted} />
          <Text style={styles.timezoneText}>Times shown in India time</Text>
        </View>
        {actionError ? (
          <InfoMessage text={actionError} variant="error" />
        ) : null}
        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Booking details</Text>
          </View>
          <DetailRow title="Location" value={location || '—'} />
          <DetailRow title="Booking status" value={job.status} />
          <DetailRow title="Work status" value={workStatus} />
          <DetailRow title="Payment type" value={job.paymentType || '—'} />
          <DetailRow title="Payment status" value={job.paymentStatus || '—'} />
          {job.paymentMethod === 'Cash' ? (
            <DetailRow
              title="Cash collection"
              value={
                job.cashCollectionStatus ||
                (job.paymentStatus === 'Paid' ? 'Received' : 'NotRecorded')
              }
            />
          ) : null}
          {job.paymentType === 'Membership' ? (
            <DetailRow
              title="Membership"
              value={
                typeof job.membershipId === 'string'
                  ? job.membershipId
                  : job.membershipId?._id || 'Membership wash'
              }
            />
          ) : null}
          <DetailRow
            title="Booking note"
            value={job.remarks || 'No booking note'}
          />
          {carDetails?.imageUrl ? (
            <Image
              source={{ uri: carDetails.imageUrl }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
            />
          ) : null}
          <DetailRow title="Color" value={carDetails?.color || '—'} />
          <DetailRow title="Vehicle type" value={carDetails?.carType || '—'} />
          <DetailRow title="Parking" value={carDetails?.parkingSlot || '—'} />
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Customer details</Text>
          </View>
          {customer ? (
            <>
              <View style={styles.customerIdentity}>
                {customer.imageUrl ? (
                  <Image
                    source={{ uri: customer.imageUrl }}
                    style={styles.customerAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.customerAvatar,
                      styles.customerAvatarPlaceholder,
                    ]}
                  >
                    <Feather name="user" size={19} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.title}>{customer.name || 'Customer'}</Text>
              </View>
              <DetailRow title="Phone" value={customer.phone || '—'} />
              <DetailRow title="Email" value={customer.email || '—'} />
              <DetailRow title="Address" value={customer.address || '—'} />
            </>
          ) : (
            <Text style={styles.copy}>Customer details are unavailable.</Text>
          )}
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="camera" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Cleaning photos</Text>
          </View>
          <View style={styles.photoRow}>
            <View style={styles.photoItem}>
              <Text style={styles.copy}>Before cleaning</Text>
              {photoPreviews.beforePhoto || job.beforePhoto ? (
                <Image
                  source={{
                    uri: photoPreviews.beforePhoto || job.beforePhoto || '',
                  }}
                  style={styles.photo}
                  onError={event =>
                    setPhotoError(
                      `Before-cleaning photo preview could not load: ${
                        event.nativeEvent.error ||
                        'Image source is unavailable.'
                      }`,
                    )
                  }
                />
              ) : (
                <Text style={styles.photoPlaceholder}>Not uploaded</Text>
              )}
            </View>
            <View style={styles.photoItem}>
              <Text style={styles.copy}>After cleaning</Text>
              {photoPreviews.afterPhoto || job.afterPhoto ? (
                <Image
                  source={{
                    uri: photoPreviews.afterPhoto || job.afterPhoto || '',
                  }}
                  style={styles.photo}
                  onError={event =>
                    setPhotoError(
                      `After-cleaning photo preview could not load: ${
                        event.nativeEvent.error ||
                        'Image source is unavailable.'
                      }`,
                    )
                  }
                />
              ) : (
                <Text style={styles.photoPlaceholder}>Not uploaded</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="check-square" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Cleaning checklist</Text>
          </View>
          {[
            ['Exterior wash', 'exteriorWash'],
            ['Interior cleaning', 'interiorCleaning'],
            ['Dashboard', 'dashboard'],
            ['Tyre dressing', 'tyreDressing'],
            ['Vacuum cleaning', 'vacuumCleaning'],
          ].map(([title, key]) => {
            const checked =
              job.cleaningChecklist?.[
                key as keyof NonNullable<Booking['cleaningChecklist']>
              ] ?? false;
            return (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.copy}>{title}</Text>
                <Text
                  style={
                    checked ? styles.checklistDone : styles.checklistPending
                  }
                >
                  {checked ? 'Done' : 'Pending'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Worker notes</Text>
          </View>
          <Text style={styles.copy}>
            {job.workerNotes || 'No worker notes'}
          </Text>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="activity" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Work timeline</Text>
          </View>
          <View style={styles.timeline}>
            {(job.workSessions || []).map((session, index) => {
              const isLast = index === (job.workSessions?.length || 0) - 1;
              return (
                <View
                  key={`${session.startedAt}-${index}`}
                  style={styles.timelineItem}
                >
                  <View style={styles.timelineMarker} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>
                      {index === 0 ? 'Work started' : 'Work resumed'}
                    </Text>
                    <Text style={styles.copy}>
                      {formatTimelineTime(session.startedAt)}
                    </Text>
                    {session.endedAt ? (
                      <>
                        <Text style={styles.timelineTitle}>
                          {workStatus === 'Completed' && isLast
                            ? 'Work completed'
                            : 'Work paused'}
                        </Text>
                        <Text style={styles.copy}>
                          {formatTimelineTime(session.endedAt)}
                          {typeof session.durationSeconds === 'number'
                            ? ` · ${formatDuration(session.durationSeconds)}`
                            : ''}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.timelineActive}>Session active</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {job.workCompletedAt && !job.workSessions?.length ? (
              <View style={styles.timelineItem}>
                <View style={styles.timelineMarker} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Work completed</Text>
                  <Text style={styles.copy}>
                    {formatTimelineTime(job.workCompletedAt)}
                  </Text>
                </View>
              </View>
            ) : null}
            {!job.workSessions?.length && !job.workCompletedAt ? (
              <Text style={styles.copy}>No work sessions recorded yet.</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Work summary</Text>
          </View>
          <DetailRow
            title="Total working time"
            value={formatDuration(elapsedSeconds)}
          />
          <DetailRow
            title="Completed at"
            value={
              job.workCompletedAt
                ? formatTimelineTime(job.workCompletedAt)
                : 'Not completed'
            }
          />
        </View>
        {shouldShowStartWorkAction(job) ? (
          <>
            {!job.beforePhoto ? (
              <ActionButton
                title="Take before-cleaning photo"
                onPress={() => choosePhoto('beforePhoto')}
                disabled={progressDisabled || !isBookingDateToday}
                variant="secondary"
              />
            ) : null}
            <ActionButton
              title="Start work"
              onPress={() => onAction('start')}
              disabled={disabled || !startAllowed || !job.beforePhoto}
            />
          </>
        ) : workStatus === 'Working' ? (
          <View style={styles.actions}>
            <ActionButton
              title="Pause"
              onPress={() => onAction('stop')}
              disabled={disabled || !otherActionsAllowed}
              variant="secondary"
              style={styles.action}
            />
            <ActionButton
              title="Complete"
              onPress={completeWork}
              disabled={disabled || !otherActionsAllowed || !canComplete}
              style={[styles.action, styles.actionNext]}
            />
          </View>
        ) : !isFinal && workStatus === 'Paused' ? (
          <View style={styles.actions}>
            <ActionButton
              title="Resume"
              onPress={() => onAction('resume')}
              disabled={disabled || !otherActionsAllowed}
              style={styles.action}
            />
            <ActionButton
              title="Complete"
              onPress={completeWork}
              disabled={disabled || !otherActionsAllowed || !canComplete}
              variant="secondary"
              style={[styles.action, styles.actionNext]}
            />
          </View>
        ) : null}
        {!isFinal &&
        workStatus !== 'NotStarted' &&
        workStatus !== 'Completed' ? (
          <View style={styles.progressSection}>
            <View style={styles.sectionHeading}>
              <Feather name="edit-3" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Update job progress</Text>
            </View>
            {checklistItems.map(([key, title]) => (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: checklist[key],
                  disabled: progressDisabled,
                }}
                disabled={progressDisabled || !isBookingDateToday}
                onPress={() =>
                  onProgress({
                    cleaningChecklist: {
                      ...checklist,
                      [key]: !checklist[key],
                    },
                  })
                }
                style={styles.checklistRow}
              >
                <Feather
                  name={checklist[key] ? 'check-circle' : 'circle'}
                  size={18}
                  color={checklist[key] ? colors.success : colors.muted}
                />
                <Text style={styles.checklistLabel}>{title}</Text>
              </Pressable>
            ))}
            {photoPreviews.afterPhoto || job.afterPhoto ? (
              <Image
                source={{
                  uri: photoPreviews.afterPhoto || job.afterPhoto || '',
                }}
                style={styles.photo}
                onError={event =>
                  setPhotoError(
                    `After-cleaning photo preview could not load: ${
                      event.nativeEvent.error || 'Image source is unavailable.'
                    }`,
                  )
                }
              />
            ) : null}
            <ActionButton
              title="Take after-cleaning photo"
              variant="secondary"
              onPress={() => choosePhoto('afterPhoto')}
              disabled={progressDisabled || !isBookingDateToday}
            />
            <TextField
              accessibilityLabel="Cleaning notes"
              placeholder="Cleaning notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
              style={styles.notesInput}
            />
            <ActionButton
              title="Save notes"
              variant="secondary"
              onPress={() => onProgress({ workerNotes: notes })}
              disabled={progressDisabled || !isBookingDateToday}
            />
          </View>
        ) : null}
        {photoError ? <InfoMessage text={photoError} variant="error" /> : null}
        {!isFinal && workStatus !== 'NotStarted' && !canComplete ? (
          <Text style={styles.copy}>
            Add the after photo and complete every checklist item to finish.
          </Text>
        ) : null}
        {!isFinal &&
        ((workStatus === 'NotStarted' && !startAllowed) ||
          (workStatus !== 'NotStarted' &&
            workStatus !== 'Completed' &&
            !otherActionsAllowed)) ? (
          <Text style={styles.copy}>
            Work actions are only available on the booking date.
          </Text>
        ) : null}
        {isFinal ? <Text style={styles.copy}>This job is closed.</Text> : null}
      </DetailsSheet>
    </Card>
  );
};

const label = (value: unknown) => {
  if (typeof value === 'string') return '';
  if (!value || typeof value !== 'object') return '';
  const record = value as {
    name?: string;
    flatNumber?: string;
    block?: string;
  };
  return (
    record.name || [record.block, record.flatNumber].filter(Boolean).join(' ')
  );
};

const DetailRow = ({ title, value }: { title: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  copy: { fontSize: 13, lineHeight: 19, color: colors.muted },
  progressSection: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE8ED',
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  jobDetailHero: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D5E9E9',
    borderRadius: 18,
    backgroundColor: '#F3FAFA',
  },
  jobDetailHeroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobDetailHeroIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  jobDetailHeroCopy: { flex: 1, minWidth: 0, gap: 4 },
  jobDetailHeroTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  jobDetailHeroVehicle: { fontSize: 11, color: colors.muted },
  jobDetailHeroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D5E2E5',
  },
  jobDetailHeroFooter: { flexDirection: 'row', gap: 12 },
  jobDetailHeroMetric: { flex: 1, minWidth: 0, gap: 4 },
  timezoneHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timezoneText: { fontSize: 10, color: colors.muted },
  jobSummary: { gap: 11, padding: 14 },
  jobCard: {
    gap: 0,
    overflow: 'hidden',
    padding: 0,
    borderRadius: 19,
    borderColor: '#DCE8ED',
    shadowOpacity: 0.07,
    elevation: 3,
  },
  jobCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobServiceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  jobServiceCopy: { flex: 1, minWidth: 0, gap: 4 },
  jobServiceTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  jobReference: { fontSize: 11, color: colors.muted },
  jobStatusBadge: {
    maxWidth: 105,
    flexShrink: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 11,
  },
  jobStatusBadgeComplete: { backgroundColor: '#E8F5EE' },
  jobStatusBadgeWorking: { backgroundColor: '#EAF0FF' },
  jobStatusBadgePaused: { backgroundColor: '#FFF4E5' },
  jobStatusBadgeWaiting: { backgroundColor: colors.paleBlue },
  jobStatusBadgeCancelled: { backgroundColor: '#FDECEA' },
  jobStatusText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  jobStatusTextComplete: { color: colors.success },
  jobStatusTextWorking: { color: '#526BC4' },
  jobStatusTextPaused: { color: '#A15C00' },
  jobStatusTextWaiting: { color: colors.primaryDark },
  jobStatusTextCancelled: { color: colors.danger },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  jobMetaIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F6F7',
  },
  jobMetaCopy: { flex: 1, minWidth: 0, gap: 2 },
  jobMetaLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  jobMetaValue: { fontSize: 12, fontWeight: '600', color: colors.ink },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#FBFCFD',
  },
  jobAmountGroup: { flex: 1, minWidth: 0, gap: 2 },
  jobAmountLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.muted,
  },
  jobAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  manageButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#CDE5E6',
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  timelineToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  timeline: {
    gap: 10,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 12,
  },
  detailsSection: {
    gap: 11,
    marginHorizontal: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2EAF0',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    shadowColor: '#16324A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE6EC',
  },
  vehiclePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  customerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.canvas,
  },
  customerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paleBlue,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { flex: 1, fontSize: 12, color: colors.muted },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: colors.ink,
    fontWeight: '600',
  },
  timelineItem: { flexDirection: 'row', gap: 8 },
  timelineMarker: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineContent: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  timelineActive: { fontSize: 12, fontWeight: '600', color: colors.success },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoItem: { flex: 1, gap: 4 },
  photoPlaceholder: {
    height: 110,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    color: colors.muted,
    fontSize: 12,
  },
  checklistDone: { fontSize: 12, fontWeight: '700', color: colors.success },
  checklistPending: { fontSize: 12, color: colors.muted },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E4EBEF',
    borderRadius: 12,
    backgroundColor: '#FBFCFD',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  notesInput: {
    minHeight: 82,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.ink,
    backgroundColor: '#FBFCFD',
  },
  photo: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    backgroundColor: colors.canvas,
  },
  actions: { flexDirection: 'row' },
  action: { flex: 1 },
  actionNext: { marginLeft: 8 },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: { fontSize: 16, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  days: { gap: 8, paddingVertical: 3 },
  day: {
    width: 64,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 5,
    backgroundColor: colors.white,
  },
  today: { borderColor: colors.primary, borderWidth: 1.5 },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontSize: 10, fontWeight: '600', color: colors.muted },
  dayNumber: { fontSize: 15, color: colors.ink },
  dayCount: { fontSize: 9, color: colors.muted },
  dayTextSelected: { color: colors.white },
  dayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 10,
  },
  dayTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activeFilterLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  activeFilterChip: {
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
  searchHint: {
    flex: 1,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'right',
  },
  emptyStateCard: {
    gap: 12,
    padding: 17,
    borderRadius: 19,
    borderColor: '#DCE8ED',
  },
  emptyStateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyStateIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.paleBlue,
  },
  emptyStateCopy: { flex: 1, gap: 3 },
  emptyStateEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  emptyStateDescription: { fontSize: 12, lineHeight: 18, color: colors.muted },
});

export default WorkerJobsScreen;

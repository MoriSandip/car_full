import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs, {type Dayjs} from 'dayjs';
import {launchCamera} from 'react-native-image-picker';
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
import {
  useGetAssignedBookingsQuery,
  useGetMyAttendanceQuery,
  usePerformWorkActionMutation,
  useUpdateCleaningProgressMutation,
} from '../../store/worker.api';
import {Booking} from '../../store/types';
import {
  canPerformBookingWorkAction,
  canPerformWorkAction,
  isBookingWorkDate,
  type WorkAction,
} from '../../store/worker-workflow';

const errorMessage = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Unable to update this job.';
};

const WorkerJobsScreen = () => {
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [selectedDay, setSelectedDay] = useState<Dayjs>(() =>
    dayjs().startOf('day'),
  );
  const monthDays = useMemo(
    () =>
      Array.from({length: month.add(1, 'month').diff(month, 'day')}, (_, index) =>
        month.add(index, 'day'),
      ),
    [month],
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
  const {currentData: data, isLoading, isError, isFetching, refetch} =
    useGetAssignedBookingsQuery({
      page: 1,
      limit: 100,
      from: month.format('YYYY-MM-DD'),
      toExclusive: month.add(1, 'month').format('YYYY-MM-DD'),
    }, {
      pollingInterval: 30_000,
      refetchOnMountOrArgChange: true,
    });
  const attendanceQuery = useGetMyAttendanceQuery();
  const attendance = attendanceQuery.data?.data ?? null;
  const canUpdateWork =
    !attendanceQuery.isLoading &&
    !attendanceQuery.isFetching &&
    !attendanceQuery.isError &&
    canPerformWorkAction(attendance, 'start');
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
      if (status !== 'All' && job.status.toLowerCase() !== status.toLowerCase()) {
        return false;
      }
      if (!term) return true;

      const car =
        typeof job.carId === 'string'
          ? job.carId
          : [
              job.carId.registrationNumber,
              job.carId.make,
              job.carId.model,
            ]
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
  const groupedJobs = useMemo(() => {
    const sortedJobs = [...selectedDayJobs].sort((left, right) => {
      const byDate = left.bookingDate.localeCompare(right.bookingDate);
      return byDate || left.bookingTime.localeCompare(right.bookingTime);
    });

    return sortedJobs.reduce<Array<{date: string; bookings: Booking[]}>>(
      (groups, job) => {
        const date = dayjs(job.bookingDate).format('YYYY-MM-DD');
        const lastGroup = groups[groups.length - 1];
        if (lastGroup?.date === date) {
          lastGroup.bookings.push(job);
        } else {
          groups.push({date, bookings: [job]});
        }
        return groups;
      },
      [],
    );
  }, [selectedDayJobs]);

  const runAction = async (
    booking: Booking,
    action: WorkAction,
    cashReceived?: boolean,
  ) => {
    setActionError('');
    if (!canPerformBookingWorkAction(booking, action, now)) {
      setActionError(
        action === 'start'
          ? 'Work can only start on the booking date, at or after the scheduled time.'
          : 'Work actions are only allowed on the booking date.',
      );
      return;
    }
    if (
      !canUpdateWork ||
      !canPerformWorkAction(attendance, action)
    ) {
      setActionError(
        attendanceQuery.isError
          ? 'Could not verify today’s attendance. Refresh attendance before updating job progress.'
          : attendanceQuery.isLoading || attendanceQuery.isFetching
            ? 'Attendance is still being verified. Try again shortly.'
            : "Punch in for today's shift before updating job progress.",
      );
      return;
    }
    try {
      await performAction({
        bookingId: booking._id,
        action,
        ...(cashReceived === undefined ? {} : {cashReceived}),
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
      await updateProgress({bookingId, progress}).unwrap();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <Page>
      <PageTitle
        title="Monthly schedule"
        subtitle="View your assigned washes by date and update job progress."
      />
      <View style={styles.monthNavigation}>
        <ActionButton
          title="Previous"
          variant="secondary"
          onPress={() => {
            const previous = month.subtract(1, 'month');
            setMonth(previous);
            setSelectedDay(previous);
          }}
        />
        <Text style={styles.monthLabel}>{month.format('MMMM YYYY')}</Text>
        <ActionButton
          title="Next"
          variant="secondary"
          onPress={() => {
            const next = month.add(1, 'month');
            setMonth(next);
            setSelectedDay(next);
          }}
        />
      </View>
      <View style={styles.stats}>
        <ScheduleStat title="Assigned" value={isLoading ? '—' : jobs.length} />
        <ScheduleStat title="Pending" value={isLoading ? '—' : pendingCount} />
        <ScheduleStat title="Completed" value={isLoading ? '—' : completedCount} />
        <ScheduleStat title="Cancelled" value={isLoading ? '—' : cancelledCount} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
        accessibilityLabel={`${month.format('MMMM YYYY')} booking dates`}>
        {monthDays.map(day => {
          const dayKey = day.format('YYYY-MM-DD');
          const count = jobs.filter(
            job => dayjs(job.bookingDate).format('YYYY-MM-DD') === dayKey,
          ).length;
          const selected =
            dayKey === selectedDay.format('YYYY-MM-DD');

          return (
            <Pressable
              key={dayKey}
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => setSelectedDay(day)}
              style={[styles.day, selected && styles.daySelected]}>
              <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
                {day.format('ddd')}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>
                {day.format('D')}
              </Text>
              <Text style={[styles.dayCount, selected && styles.dayTextSelected]}>
                {count ? `${count} ${count === 1 ? 'job' : 'jobs'}` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh jobs'}
        variant="secondary"
        onPress={() => refetch()}
        disabled={isFetching}
      />
      {attendanceQuery.isError ? (
        <InfoMessage
          text="Could not verify today's attendance. Refresh attendance before updating job progress."
          variant="error"
        />
      ) : attendanceQuery.isLoading || attendanceQuery.isFetching ? (
        <LoadingMessage text="Verifying today's attendance..." />
      ) : !canUpdateWork ? (
        <InfoMessage text="Punch in for today's shift in the Punch tab before starting, pausing, resuming, or completing a job." />
      ) : null}
      <TextField
        accessibilityLabel="Search assigned bookings"
        placeholder="Search by car, service, or booking status"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filters}>
        {['All', 'Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'].map(value => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{selected: status === value}}
            onPress={() => setStatus(value)}
            style={[styles.filter, status === value && styles.filterSelected]}>
            <Text style={[styles.filterText, status === value && styles.filterTextSelected]}>
              {value === 'InProgress' ? 'In progress' : value}
            </Text>
          </Pressable>
        ))}
      </View>
      {actionError ? (
        <InfoMessage text={actionError} variant="error" />
      ) : null}
      {isLoading || (isFetching && !data) ? (
        <LoadingMessage text="Loading assignments..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load assigned jobs. Please refresh."
          variant="error"
        />
      ) : visibleJobs.length === 0 ? (
        <Card style={styles.jobCard}>
          <Text style={styles.title}>
            {jobs.length === 0 ? 'No jobs this month' : 'No matching jobs'}
          </Text>
          <Text style={styles.copy}>
            {jobs.length === 0
              ? `Assigned washes for ${month.format('MMMM YYYY')} will appear here.`
              : 'Try a different search or status filter.'}
          </Text>
        </Card>
      ) : (
        selectedDayJobs.length === 0 ? (
          <Card style={styles.jobCard}>
            <Text style={styles.title}>No jobs for this day</Text>
            <Text style={styles.copy}>
              No matching jobs are scheduled for {selectedDay.format('D MMMM YYYY')}.
            </Text>
          </Card>
        ) : <View style={styles.list}>
          {groupedJobs.map(group => (
            <View key={group.date} style={styles.dayGroup}>
              <View style={styles.dayHeading}>
                <Text style={styles.dayTitle}>
                  {dayjs(group.date).format('dddd, D MMMM')}
                </Text>
                <Text style={styles.copy}>
                  {group.bookings.length} {group.bookings.length === 1 ? 'job' : 'jobs'}
                </Text>
              </View>
              {group.bookings.map(job => (
                <JobCard
                  key={job._id}
                  job={job}
                  disabled={mutation.isLoading || !canUpdateWork}
                  now={now}
                  onAction={(action, cashReceived) =>
                    runAction(job, action, cashReceived)
                  }
                  onProgress={progress => saveProgress(job._id, progress)}
                  progressDisabled={
                    progressMutation.isLoading || !canUpdateWork
                  }
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
};

const ScheduleStat = ({title, value}: {title: string; value: number | string}) => (
  <Card style={styles.stat}>
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </Card>
);

const JobCard = ({
  job,
  disabled,
  now,
  onAction,
  onProgress,
  progressDisabled,
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
}) => {
  const [notes, setNotes] = useState(job.workerNotes || '');
  const [photoError, setPhotoError] = useState('');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const workStatus = job.workStatus || 'NotStarted';
  const isFinal = job.status === 'Completed' || job.status === 'Cancelled';
  const car =
    typeof job.carId === 'string'
      ? job.carId
      : `${job.carId.registrationNumber || ''} ${job.carId.make || ''} ${
          job.carId.model || ''
        }`.trim();
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
  const elapsedSeconds =
    (job.totalWorkingSeconds ?? 0) + activeSeconds;
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
        `Was ₹${Number(job.amountPayable || 0).toFixed(2)} collected from the customer?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Not received', onPress: () => onAction('done', false)},
          {text: 'Received', onPress: () => onAction('done', true)},
        ],
      );
      return;
    }
    onAction('done');
  };

  const capturePhoto = async (kind: 'beforePhoto' | 'afterPhoto') => {
    setPhotoError('');
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          setPhotoError('Camera permission is required to add cleaning photos.');
          return;
        }
      }
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.5,
        maxWidth: 960,
        maxHeight: 960,
        includeBase64: true,
        saveToPhotos: false,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setPhotoError(result.errorMessage || 'Camera could not be opened.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.type?.match(/^image\/(jpeg|png|webp)$/)) {
        setPhotoError('Could not read the photo. Please take another photo.');
        return;
      }
      const photo = `data:${asset.type};base64,${asset.base64}`;
      if (photo.length > 2_800_000) {
        setPhotoError('Photo is too large. Please take another photo.');
        return;
      }
      onProgress({[kind]: photo});
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Camera could not be opened.',
      );
    }
  };

  return (
    <Card>
      {typeof job.carId !== 'string' && job.carId.imageUrl ? (
        <Image source={{uri: job.carId.imageUrl}} style={styles.carImage} />
      ) : null}
      <View style={styles.row}>
        <Text style={styles.title}>
          {job.serviceNameSnapshot || 'Car wash'}
        </Text>
        <Text style={styles.status}>{job.status}</Text>
      </View>
      <Text style={styles.copy}>{car || 'Car details unavailable'}</Text>
      {location ? <Text style={styles.copy}>{location}</Text> : null}
      <Text style={styles.copy}>
        {new Date(job.bookingDate).toLocaleDateString()} · {job.bookingTime}
      </Text>
      {job.paymentType === 'Membership' ? (
        <Text style={styles.copy}>
          Membership wash
          {typeof job.membershipId === 'object' && job.membershipId
            ? ` · ${Math.max(
                0,
                Number(job.membershipId.includedWashes ?? 0) -
                  Number(job.membershipId.usedWashes ?? 0) -
                  Number(job.membershipId.reservedWashes ?? 0),
              )} more available to schedule`
            : ''}
        </Text>
      ) : null}
      {job.remarks ? <Text style={styles.copy}>Note: {job.remarks}</Text> : null}
      {job.paymentMethod === 'Cash' ? (
        <Text style={styles.copy}>
          Cash payment · {job.paymentStatus}
        </Text>
      ) : null}
      <Text style={styles.workStatus}>Work: {workStatus}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: timelineExpanded}}
        onPress={() => setTimelineExpanded(value => !value)}
        style={styles.timelineToggle}>
        <Text style={styles.timelineToggleText}>View full task details</Text>
      </Pressable>
      <Modal
        visible={timelineExpanded}
        transparent
        animationType="slide"
        onRequestClose={() => setTimelineExpanded(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.detailsModal}>
            <ScrollView contentContainerStyle={styles.detailsModalContent}>
              <Text style={styles.modalTitle}>Task details & work timeline</Text>
              <Text style={styles.copy}>Times shown in India time</Text>
              <View style={styles.timeline}>
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Booking details</Text>
            <DetailRow title="Booking ID" value={job._id} />
            <DetailRow title="Service" value={job.serviceNameSnapshot || 'Car wash'} />
            <DetailRow
              title="Scheduled"
              value={`${formatTimelineTime(job.bookingDate)} · ${job.bookingTime}`}
            />
            <DetailRow title="Vehicle" value={car || '—'} />
            <DetailRow title="Society / flat" value={location || '—'} />
            <DetailRow title="Booking status" value={job.status} />
            <DetailRow title="Work status" value={workStatus} />
            <DetailRow title="Payment type" value={job.paymentType || '—'} />
            <DetailRow title="Payment status" value={job.paymentStatus || '—'} />
            {job.paymentMethod === 'Cash' ? (
              <DetailRow
                title="Cash collection"
                value={job.cashCollectionStatus ||
                  (job.paymentStatus === 'Paid' ? 'Received' : 'NotRecorded')}
              />
            ) : null}
            <DetailRow
              title="Amount"
              value={`₹${Number(job.amountPayable || 0).toFixed(2)}`}
            />
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
            <DetailRow title="Booking note" value={job.remarks || 'No booking note'} />
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Cleaning photos</Text>
            <View style={styles.photoRow}>
              <View style={styles.photoItem}>
                <Text style={styles.copy}>Before cleaning</Text>
                {job.beforePhoto ? (
                  <Image source={{uri: job.beforePhoto}} style={styles.photo} />
                ) : (
                  <Text style={styles.photoPlaceholder}>Not uploaded</Text>
                )}
              </View>
              <View style={styles.photoItem}>
                <Text style={styles.copy}>After cleaning</Text>
                {job.afterPhoto ? (
                  <Image source={{uri: job.afterPhoto}} style={styles.photo} />
                ) : (
                  <Text style={styles.photoPlaceholder}>Not uploaded</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Cleaning checklist</Text>
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
                  <Text style={checked ? styles.checklistDone : styles.checklistPending}>
                    {checked ? 'Done' : 'Pending'}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Worker notes</Text>
            <Text style={styles.copy}>{job.workerNotes || 'No worker notes'}</Text>
          </View>

          {(job.workSessions || []).map((session, index) => {
            const isLast = index === (job.workSessions?.length || 0) - 1;
            return (
              <View key={`${session.startedAt}-${index}`} style={styles.timelineItem}>
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
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Work summary</Text>
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
              </View>
              <ActionButton
                title="Close details"
                variant="secondary"
                onPress={() => setTimelineExpanded(false)}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {!isFinal && job.status === 'Confirmed' && workStatus === 'NotStarted' ? (
        <>
          {!job.beforePhoto ? (
            <ActionButton
              title="Take before-cleaning photo"
              onPress={() => capturePhoto('beforePhoto')}
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
      {!isFinal && workStatus !== 'NotStarted' && workStatus !== 'Completed' ? (
        <View style={styles.progressSection}>
          <Text style={styles.workStatus}>Cleaning checklist</Text>
          {checklistItems.map(([key, title]) => (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{checked: checklist[key], disabled: progressDisabled}}
              disabled={progressDisabled || !isBookingDateToday}
              onPress={() =>
                onProgress({
                  cleaningChecklist: {
                    ...checklist,
                    [key]: !checklist[key],
                  },
                })
              }
              style={styles.checklistRow}>
              <Text style={styles.checklistMark}>
                {checklist[key] ? '✓' : '○'}
              </Text>
              <Text style={styles.copy}>{title}</Text>
            </Pressable>
          ))}
          {job.afterPhoto ? (
            <Image source={{uri: job.afterPhoto}} style={styles.photo} />
          ) : null}
          <ActionButton
            title="Take after-cleaning photo"
            variant="secondary"
            onPress={() => capturePhoto('afterPhoto')}
            disabled={progressDisabled || !isBookingDateToday}
          />
          <TextField
            accessibilityLabel="Cleaning notes"
            placeholder="Cleaning notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
          />
          <ActionButton
            title="Save notes"
            variant="secondary"
            onPress={() => onProgress({workerNotes: notes})}
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
          {isBookingDateToday
            ? 'Start is available at the scheduled booking time.'
            : 'Work actions are only available on the booking date.'}
        </Text>
      ) : null}
      {isFinal ? <Text style={styles.copy}>This job is closed.</Text> : null}
    </Card>
  );
};

const label = (value: unknown) => {
  if (typeof value === 'string') return '';
  if (!value || typeof value !== 'object') return '';
  const record = value as {name?: string; flatNumber?: string; block?: string};
  return (
    record.name ||
    [record.block, record.flatNumber].filter(Boolean).join(' ')
  );
};

const DetailRow = ({title, value}: {title: string; value: string}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{title}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  list: {},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  title: {fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 1},
  status: {marginLeft: 8, fontSize: 12, fontWeight: '700', color: colors.primary},
  copy: {fontSize: 13, lineHeight: 19, color: colors.muted},
  workStatus: {fontSize: 13, color: colors.ink, fontWeight: '700'},
  progressSection: {gap: 8},
  timelineToggle: {alignSelf: 'flex-start', paddingVertical: 5},
  timelineToggleText: {fontSize: 13, fontWeight: '700', color: colors.primary},
  modalOverlay: {flex: 1, justifyContent: 'center', padding: 14, backgroundColor: 'rgba(0,0,0,0.45)'},
  detailsModal: {maxHeight: '92%'},
  detailsModalContent: {gap: 10, paddingBottom: 8},
  modalTitle: {fontSize: 18, fontWeight: '800', color: colors.ink},
  timeline: {gap: 10, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 12},
  detailsSection: {gap: 6, paddingBottom: 8},
  sectionTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {flex: 1, textAlign: 'right', fontSize: 12, color: colors.ink, fontWeight: '600'},
  timelineItem: {flexDirection: 'row', gap: 8},
  timelineMarker: {width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: colors.primary},
  timelineContent: {flex: 1, gap: 2},
  timelineTitle: {fontSize: 13, fontWeight: '700', color: colors.ink},
  timelineActive: {fontSize: 12, fontWeight: '600', color: colors.success},
  photoRow: {flexDirection: 'row', gap: 8},
  photoItem: {flex: 1, gap: 4},
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
  checklistDone: {fontSize: 12, fontWeight: '700', color: colors.success},
  checklistPending: {fontSize: 12, color: colors.muted},
  checklistRow: {flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36},
  checklistMark: {fontSize: 19, color: colors.primary, fontWeight: '800'},
  photo: {width: '100%', height: 190, borderRadius: 10, backgroundColor: colors.canvas},
  carImage: {width: '100%', height: 150, borderRadius: 10, backgroundColor: colors.canvas, marginBottom: 8},
  actions: {flexDirection: 'row'},
  action: {flex: 1},
  actionNext: {marginLeft: 8},
  jobCard: {marginBottom: 12},
  filters: {flexDirection: 'row', flexWrap: 'wrap'},
  monthNavigation: {flexDirection: 'row', alignItems: 'center'},
  monthLabel: {flex: 1, marginHorizontal: 8, textAlign: 'center', color: colors.ink, fontSize: 15, fontWeight: '700'},
  stats: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  stat: {width: '48%', alignItems: 'center', paddingVertical: 10},
  statNumber: {fontSize: 20, fontWeight: '800', color: colors.primary},
  statLabel: {fontSize: 12, color: colors.muted},
  days: {gap: 8, paddingBottom: 4},
  day: {width: 64, minHeight: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 5, backgroundColor: colors.white},
  daySelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  dayName: {fontSize: 10, fontWeight: '600', color: colors.muted},
  dayNumber: {fontSize: 15, color: colors.ink},
  dayCount: {fontSize: 9, color: colors.muted},
  dayTextSelected: {color: colors.white},
  dayGroup: {paddingBottom: 4},
  dayHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, marginBottom: 10},
  dayTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  filter: {marginRight: 7, marginBottom: 7, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.white},
  filterSelected: {backgroundColor: colors.paleBlue, borderColor: colors.primary},
  filterText: {fontSize: 12, color: colors.muted, fontWeight: '600'},
  filterTextSelected: {color: colors.primaryDark},
});

export default WorkerJobsScreen;

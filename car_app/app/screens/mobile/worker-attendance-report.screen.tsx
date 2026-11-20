import React, {useState} from 'react';
import {RefreshControl, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {useGetMyAttendanceHistoryQuery} from '../../store/worker.api';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const WorkerAttendanceReportScreen = () => {
  const [limit, setLimit] = useState(10);
  const {data, isLoading, isError, isFetching, refetch} =
    useGetMyAttendanceHistoryQuery({page: 1, limit});
  const report = data?.data;

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
      <PageTitle compact
        title="My attendance report"
        subtitle="Review your daily punch-in and punch-out history."
      />
      {isLoading ? (
        <LoadingMessage text="Loading attendance report..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load your attendance report."
          variant="error"
        />
      ) : report?.records.length ? (
        <>
          {report.records.map(record => (
            <Card key={record._id} style={styles.recordCard}>
              <View style={styles.header}>
                <View style={styles.recordDate}>
                  <View style={styles.dateIcon}>
                    <Feather
                      name="calendar"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.heading}>{formatDate(record.dateKey)}</Text>
                </View>
                <Text
                  style={[
                    styles.badge,
                    record.punchOutAt ? styles.complete : styles.inProgress,
                  ]}>
                  {record.punchOutAt ? 'Complete' : 'In progress'}
                </Text>
              </View>
              <View style={styles.row}>
                <View style={styles.timeCard}>
                  <Text style={styles.label}>Punch in</Text>
                  <Text style={styles.time}>{formatTime(record.punchInAt)}</Text>
                </View>
                <View style={styles.timeCard}>
                  <Text style={styles.label}>Punch out</Text>
                  <Text style={styles.time}>{formatTime(record.punchOutAt)}</Text>
                </View>
              </View>
            </Card>
          ))}
          {report.meta.total > report.records.length ? (
            <ActionButton
              title={isFetching ? 'Loading...' : 'Load older attendance'}
              onPress={() => setLimit(current => current + 10)}
              disabled={isFetching}
              variant="secondary"
            />
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="clock" size={19} color={colors.primary} />
          </View>
          <Text style={styles.heading}>No attendance records yet</Text>
          <Text style={styles.copy}>
            Your completed punch-in and punch-out days will appear here.
          </Text>
        </Card>
      )}
    </Page>
  );
};

const styles = StyleSheet.create({
  recordCard: {gap: 13, borderRadius: 18},
  recordDate: {flexDirection: 'row', alignItems: 'center', gap: 9},
  dateIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  heading: {fontSize: 16, fontWeight: '800', color: colors.ink},
  copy: {fontSize: 13, lineHeight: 19, color: colors.muted},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  complete: {backgroundColor: '#E8F5EE', color: colors.success},
  inProgress: {backgroundColor: '#FFF4E5', color: '#A15C00'},
  row: {flexDirection: 'row', gap: 10},
  timeCard: {
    flex: 1,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    gap: 6,
  },
  label: {fontSize: 11, fontWeight: '600', color: colors.muted},
  time: {fontSize: 16, fontWeight: '800', color: colors.ink},
  emptyCard: {alignItems: 'flex-start', gap: 10, borderRadius: 18},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
});

export default WorkerAttendanceReportScreen;

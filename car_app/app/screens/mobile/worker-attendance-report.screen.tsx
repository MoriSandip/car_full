import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
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
    <Page>
      <PageTitle
        title="My attendance report"
        subtitle="Review your daily punch-in and punch-out history."
      />
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh report'}
        onPress={() => refetch()}
        variant="secondary"
        disabled={isFetching}
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
            <Card key={record._id}>
              <View style={styles.header}>
                <Text style={styles.heading}>{formatDate(record.dateKey)}</Text>
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
        <Card>
          <Text style={styles.copy}>No attendance records yet.</Text>
        </Card>
      )}
    </Page>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.canvas,
    gap: 6,
  },
  label: {fontSize: 12, color: colors.muted},
  time: {fontSize: 16, fontWeight: '700', color: colors.ink},
});

export default WorkerAttendanceReportScreen;

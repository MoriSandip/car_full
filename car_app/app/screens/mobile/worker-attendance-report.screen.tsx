import React, {useState} from 'react';
import {Image, RefreshControl, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
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
} from '../../components/mobile/ui';
import {useGetMyAttendanceHistoryQuery} from '../../store/worker.api';
import {WorkerAttendance} from '../../store/types';

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
  const [selectedRecord, setSelectedRecord] = useState<WorkerAttendance | null>(null);
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
            <ListItemPressable
              key={record._id}
              accessibilityLabel={`View attendance for ${formatDate(record.dateKey)}`}
              onPress={() => setSelectedRecord(record)}>
            <Card style={styles.recordCard}>
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
                <View style={styles.timeValue}>
                  <Text style={styles.label}>In</Text>
                  <Text style={styles.time}>{formatTime(record.punchInAt)}</Text>
                </View>
                <View style={styles.timeValue}>
                  <Text style={styles.label}>Out</Text>
                  <Text style={styles.time}>{formatTime(record.punchOutAt)}</Text>
                </View>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemFooterText}>View full details</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </View>
            </Card>
            </ListItemPressable>
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
      <DetailsSheet
        visible={Boolean(selectedRecord)}
        setVisible={visible => !visible && setSelectedRecord(null)}
        title="Attendance details">
        {selectedRecord ? (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(selectedRecord.dateKey)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Punch in</Text>
              <Text style={styles.detailValue}>{formatTime(selectedRecord.punchInAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Punch out</Text>
              <Text style={styles.detailValue}>{formatTime(selectedRecord.punchOutAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {selectedRecord.punchOutAt ? 'Complete' : 'In progress'}
              </Text>
            </View>
            <View style={styles.selfies}>
              <View style={styles.selfieColumn}>
                <Text style={styles.label}>Punch-in selfie</Text>
                <Image source={{uri: selectedRecord.punchInSelfie}} style={styles.selfie} />
              </View>
              {selectedRecord.punchOutSelfie ? (
                <View style={styles.selfieColumn}>
                  <Text style={styles.label}>Punch-out selfie</Text>
                  <Image source={{uri: selectedRecord.punchOutSelfie}} style={styles.selfie} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </DetailsSheet>
    </Page>
  );
};

const styles = StyleSheet.create({
  recordCard: {gap: 9, borderRadius: 14, paddingVertical: 11},
  recordDate: {flexDirection: 'row', alignItems: 'center', gap: 9},
  dateIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  heading: {fontSize: 14, fontWeight: '800', color: colors.ink},
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  timeValue: {
    flex: 1,
    gap: 2,
  },
  label: {fontSize: 11, fontWeight: '600', color: colors.muted},
  time: {fontSize: 14, fontWeight: '800', color: colors.ink},
  itemFooter: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 7,
  },
  itemFooterText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  emptyCard: {alignItems: 'flex-start', gap: 10, borderRadius: 18},
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {flex: 1, fontSize: 12, color: colors.muted},
  detailValue: {flex: 1, textAlign: 'right', fontSize: 13, color: colors.ink, fontWeight: '600'},
  selfies: {flexDirection: 'row', gap: 10},
  selfieColumn: {flex: 1, gap: 5},
  selfie: {width: '100%', height: 150, borderRadius: 10, backgroundColor: colors.canvas},
});

export default WorkerAttendanceReportScreen;

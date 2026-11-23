import React, {useState} from 'react';
import {Pressable, Share, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  Card,
  colors,
  InfoMessage,
  Page,
  TextField,
} from '../../components/mobile/ui';
import {
  useCancelLeaveMutation,
  useGetMyLeavesQuery,
  useGetMyPayrollQuery,
  useRequestLeaveMutation,
} from '../../store/worker.api';

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
const errorText = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Request could not be completed.';
};

const WorkerLeavePayrollScreen = () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [leaveType, setLeaveType] = useState<'Paid' | 'Unpaid'>('Paid');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const leavesQuery = useGetMyLeavesQuery();
  const payrollQuery = useGetMyPayrollQuery();
  const [requestLeave, requestState] = useRequestLeaveMutation();
  const [cancelLeave, cancelState] = useCancelLeaveMutation();
  const leaves = leavesQuery.data?.data ?? [];
  const payroll = payrollQuery.data?.data ?? [];

  const submit = async () => {
    setError('');
    if (!startDate || !endDate || startDate > endDate || !reason.trim()) {
      setError('Enter valid leave dates and a reason.');
      return;
    }
    if (halfDay && startDate !== endDate) {
      setError('Half-day leave can only be requested for one day.');
      return;
    }
    try {
      await requestLeave({
        startDate,
        endDate,
        leaveType,
        halfDay,
        reason: reason.trim(),
      }).unwrap();
      setReason('');
      setHalfDay(false);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const cancel = async (id: string) => {
    setError('');
    try {
      await cancelLeave(id).unwrap();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  return (
    <Page>
      {error ? <InfoMessage text={error} variant="error" /> : null}
      <Card style={styles.section}>
        <Text style={styles.title}>Apply for leave</Text>
        <Text style={styles.helper}>
          Select a date range for multiple days. Admin approval is required.
        </Text>
        <Text style={styles.label}>From (YYYY-MM-DD)</Text>
        <TextField
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <Text style={styles.label}>To (YYYY-MM-DD)</Text>
        <TextField
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Leave type</Text>
        <View style={styles.row}>
          {(['Paid', 'Unpaid'] as const).map(type => (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{selected: leaveType === type}}
              onPress={() => setLeaveType(type)}
              style={[styles.choice, leaveType === type && styles.choiceActive]}>
              <Text
                style={[
                  styles.choiceText,
                  leaveType === type && styles.choiceTextActive,
                ]}>
                {type}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{checked: halfDay}}
            onPress={() => setHalfDay(value => !value)}
            style={[styles.choice, halfDay && styles.choiceActive]}>
            <Text
              style={[
                styles.choiceText,
                halfDay && styles.choiceTextActive,
              ]}>
              {halfDay ? 'Half day ✓' : 'Full day'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Reason</Text>
        <TextField
          value={reason}
          onChangeText={setReason}
          placeholder="Tell admin why you need leave"
          multiline
          maxLength={1000}
          style={styles.reason}
          textAlignVertical="top"
        />
        <Pressable
          accessibilityRole="button"
          disabled={requestState.isLoading}
          onPress={submit}
          style={({pressed}) => [
            styles.primaryButton,
            pressed && styles.pressed,
            requestState.isLoading && styles.disabled,
          ]}>
          <Text style={styles.primaryButtonText}>
            {requestState.isLoading ? 'Submitting…' : 'Submit request'}
          </Text>
        </Pressable>
      </Card>

      <View style={styles.sectionHeading}>
        <Text style={styles.title}>My leave requests</Text>
      </View>
      {leavesQuery.isError ? (
        <InfoMessage text="Leave requests could not be loaded." variant="error" />
      ) : null}
      {leaves.map(leave => (
        <Card key={leave._id} style={styles.itemCard}>
          <View style={styles.itemTop}>
            <Text style={styles.itemTitle}>
              {leave.startDate} – {leave.endDate}
            </Text>
            <Text style={styles.status}>{leave.status}</Text>
          </View>
          <Text style={styles.helper}>
            {leave.leaveType} · {leave.halfDay ? 'Half day' : 'Full day'}
          </Text>
          <Text style={styles.body}>{leave.reason}</Text>
          {leave.reviewNote ? (
            <Text style={styles.helper}>Admin: {leave.reviewNote}</Text>
          ) : null}
          {leave.status === 'Pending' ? (
            <Pressable
              accessibilityRole="button"
              disabled={cancelState.isLoading}
              onPress={() => cancel(leave._id)}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel request</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      {!leaves.length && !leavesQuery.isLoading ? (
        <Text style={styles.empty}>No leave requests yet.</Text>
      ) : null}

      <View style={styles.sectionHeading}>
        <Text style={styles.title}>My payslips</Text>
      </View>
      {payrollQuery.isError ? (
        <InfoMessage text="Payroll records could not be loaded." variant="error" />
      ) : null}
      {payroll.map(record => (
        <Card key={record._id} style={styles.itemCard}>
          <View style={styles.itemTop}>
            <Text style={styles.itemTitle}>
              {record.periodStart} – {record.periodEnd}
            </Text>
            <Text style={styles.status}>{record.status}</Text>
          </View>
          <View style={styles.details}>
            <Detail label="Monthly salary" value={money(record.monthlySalary)} />
            <Detail label="Base pay" value={money(record.basePay)} />
            <Detail label="Absent days" value={String(record.absentDays)} />
            <Detail
              label="Paid / unpaid leave"
              value={`${record.paidLeaveDays} / ${record.unpaidLeaveDays} days`}
            />
            <Detail
              label="Overtime"
              value={`${record.overtimeHours}h · ${money(record.overtimePay)}`}
            />
            <Detail label="Deductions" value={money(record.deductions)} />
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net pay</Text>
            <Text style={styles.netAmount}>{money(record.netPay)}</Text>
          </View>
          {record.status === 'Paid' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Share.share({
                  title: 'CarWash payslip',
                  message: [
                    `Payslip ${record.periodStart} to ${record.periodEnd}`,
                    `Status: ${record.status}`,
                    `Monthly salary: ${money(record.monthlySalary)}`,
                    `Base pay: ${money(record.basePay)}`,
                    `Paid leave: ${record.paidLeaveDays} days`,
                    `Unpaid leave: ${record.unpaidLeaveDays} days`,
                    `Absent: ${record.absentDays} days`,
                    `Overtime: ${record.overtimeHours}h (${money(record.overtimePay)})`,
                    `Deductions: ${money(record.deductions)}`,
                    `Net pay: ${money(record.netPay)}`,
                    record.paymentReference
                      ? `Payment reference: ${record.paymentReference}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                })
              }
              style={styles.secondaryButton}>
              <Feather name="share-2" size={15} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Share payslip</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      {!payroll.length && !payrollQuery.isLoading ? (
        <Text style={styles.empty}>No payslips available yet.</Text>
      ) : null}
    </Page>
  );
};

const Detail = ({label, value}: {label: string; value: string}) => (
  <View style={styles.detail}>
    <Text style={styles.helper}>{label}</Text>
    <Text style={styles.body}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  section: {padding: 16, marginBottom: 8},
  title: {fontSize: 18, fontWeight: '800', color: colors.ink},
  helper: {fontSize: 12, color: colors.muted, marginTop: 4},
  label: {fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 14, marginBottom: 6},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
  choice: {borderWidth: 1, borderColor: colors.border, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10},
  choiceActive: {backgroundColor: colors.paleBlue, borderColor: colors.primary},
  choiceText: {color: colors.ink, fontWeight: '700', fontSize: 12},
  choiceTextActive: {color: colors.primaryDark},
  reason: {minHeight: 84, paddingTop: 12},
  primaryButton: {marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center'},
  primaryButtonText: {color: colors.white, fontWeight: '800'},
  pressed: {opacity: 0.8},
  disabled: {opacity: 0.55},
  sectionHeading: {marginTop: 18, marginBottom: 4},
  itemCard: {padding: 15, marginBottom: 10},
  itemTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8},
  itemTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  status: {fontSize: 11, fontWeight: '800', color: colors.primary},
  body: {fontSize: 13, color: colors.ink, marginTop: 7},
  secondaryButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, padding: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 10},
  secondaryButtonText: {color: colors.primary, fontWeight: '700', fontSize: 12},
  empty: {color: colors.muted, fontSize: 13, marginVertical: 8},
  details: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12},
  detail: {width: '50%', marginBottom: 10},
  netRow: {borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, marginTop: 3, flexDirection: 'row', justifyContent: 'space-between'},
  netLabel: {fontSize: 14, fontWeight: '800', color: colors.ink},
  netAmount: {fontSize: 16, fontWeight: '900', color: colors.primaryDark},
});

export default WorkerLeavePayrollScreen;

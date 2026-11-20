import React, {useState} from 'react';
import {
  Image,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {launchCamera} from 'react-native-image-picker';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {
  useGetMyAttendanceQuery,
  usePunchAttendanceMutation,
} from '../../store/worker.api';

const errorMessage = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Attendance could not be saved.';
};

const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const WorkerAttendanceScreen = () => {
  const {data, isLoading, isError, refetch, isFetching} =
    useGetMyAttendanceQuery();
  const [punch, mutation] = usePunchAttendanceMutation();
  const [selfie, setSelfie] = useState('');
  const [error, setError] = useState('');
  const attendance = data?.data ?? null;
  const isPunchedIn = Boolean(attendance);
  const isPunchedOut = Boolean(attendance?.punchOutAt);

  const captureSelfie = async () => {
    setError('');
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Camera permission is required to record attendance.');
          return;
        }
      }
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.7,
        maxWidth: 1280,
        maxHeight: 1280,
        includeBase64: true,
        saveToPhotos: false,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setError(result.errorMessage || 'Camera could not be opened.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.type?.match(/^image\/(jpeg|png|webp)$/)) {
        setError('Could not read the selfie. Please take another photo.');
        return;
      }
      const imageData = `data:${asset.type};base64,${asset.base64}`;
      if (imageData.length > 7_000_000) {
        setError('Selfie is too large. Please take another photo.');
        return;
      }
      setSelfie(imageData);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Camera could not be opened.',
      );
    }
  };

  const submitPunch = async () => {
    if (!selfie) {
      setError('Take a selfie before punching in or out.');
      return;
    }
    setError('');
    try {
      await punch({action: isPunchedIn ? 'out' : 'in', selfie}).unwrap();
      setSelfie('');
      await refetch();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

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
        title="My attendance"
        subtitle="Take a selfie to record today's punch in and punch out."
      />
      {isLoading ? (
        <LoadingMessage text="Loading today's attendance..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load attendance. Please refresh."
          variant="error"
        />
      ) : (
        <>
          <Card style={styles.shiftCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.heading}>Today's shift</Text>
                <Text style={styles.copy}>
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.timeValue}>
                <View style={styles.timeLabel}>
                  <Feather name="log-in" size={14} color={colors.primary} />
                  <Text style={styles.label}>In</Text>
                </View>
                <Text style={styles.time}>{formatTime(attendance?.punchInAt)}</Text>
              </View>
              <View style={styles.timeValue}>
                <View style={styles.timeLabel}>
                  <Feather name="log-out" size={14} color={colors.muted} />
                  <Text style={styles.label}>Out</Text>
                </View>
                <Text style={styles.time}>{formatTime(attendance?.punchOutAt)}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.selfieCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}>
                <Feather name="camera" size={16} color={colors.primary} />
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.heading}>Attendance selfie</Text>
                <Text style={styles.copy}>
                  Take a fresh selfie for each punch.
                </Text>
              </View>
            </View>
            {selfie ? (
              <Image source={{uri: selfie}} style={styles.preview} />
            ) : (
              <View style={styles.selfiePlaceholder}>
                <View style={styles.cameraIcon}>
                  <Feather name="camera" size={22} color={colors.primary} />
                </View>
                <Text style={styles.placeholderTitle}>Selfie required</Text>
                <Text style={styles.copy}>
                  Use the front camera to verify your attendance.
                </Text>
              </View>
            )}
            <ActionButton
              title={selfie ? 'Retake selfie' : 'Take selfie'}
              onPress={captureSelfie}
              variant="secondary"
            />
          </Card>

          {error ? <InfoMessage text={error} variant="error" /> : null}
          {isPunchedOut ? (
            <InfoMessage
              text="Attendance complete for today."
              variant="success"
            />
          ) : (
            <ActionButton
              title={
                mutation.isLoading
                  ? 'Saving attendance...'
                  : isPunchedIn
                    ? 'Punch out'
                    : 'Punch in'
              }
              onPress={submitPunch}
              disabled={mutation.isLoading}
              variant={isPunchedIn ? 'danger' : 'primary'}
            />
          )}
        </>
      )}
    </Page>
  );
};

const styles = StyleSheet.create({
  shiftCard: {gap: 11, borderRadius: 14},
  selfieCard: {gap: 11, borderRadius: 14},
  cardHeading: {flexDirection: 'row', alignItems: 'center', gap: 10},
  cardIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.paleBlue,
  },
  cardHeadingCopy: {flex: 1, gap: 3},
  heading: {fontSize: 15, fontWeight: '800', color: colors.ink},
  copy: {fontSize: 13, lineHeight: 19, color: colors.muted},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
  },
  timeValue: {
    flex: 1,
    gap: 3,
  },
  timeLabel: {flexDirection: 'row', alignItems: 'center', gap: 6},
  label: {fontSize: 11, fontWeight: '600', color: colors.muted},
  time: {fontSize: 16, fontWeight: '800', color: colors.ink},
  preview: {width: '100%', height: 220, borderRadius: 14},
  selfiePlaceholder: {
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9D9E1',
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  cameraIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.paleBlue,
  },
  placeholderTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
});

export default WorkerAttendanceScreen;

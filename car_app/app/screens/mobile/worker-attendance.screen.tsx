import React, {useState} from 'react';
import {
  Image,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
    <Page>
      <PageTitle
        title="My attendance"
        subtitle="Take a selfie to record today's punch in and punch out."
      />
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh attendance'}
        onPress={() => refetch()}
        variant="secondary"
        disabled={isFetching}
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
          <Card>
            <Text style={styles.heading}>Today's shift</Text>
            <Text style={styles.copy}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <View style={styles.row}>
              <View style={styles.timeCard}>
                <Text style={styles.label}>Punch in</Text>
                <Text style={styles.time}>{formatTime(attendance?.punchInAt)}</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.label}>Punch out</Text>
                <Text style={styles.time}>{formatTime(attendance?.punchOutAt)}</Text>
              </View>
            </View>
          </Card>

          <Card>
            {selfie ? (
              <Image source={{uri: selfie}} style={styles.preview} />
            ) : (
              <Text style={styles.copy}>
                A front-camera selfie is required for every punch.
              </Text>
            )}
            <ActionButton
              title={selfie ? 'Retake selfie' : 'Take selfie'}
              onPress={() => void captureSelfie()}
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
              onPress={() => void submitPunch()}
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
  heading: {fontSize: 17, fontWeight: '800', color: colors.ink},
  copy: {fontSize: 13, lineHeight: 19, color: colors.muted},
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
  preview: {width: '100%', height: 260, borderRadius: 12},
});

export default WorkerAttendanceScreen;

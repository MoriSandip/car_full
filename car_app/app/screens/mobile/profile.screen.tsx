import React from 'react';
import {StyleSheet, Text} from 'react-native';
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
  useGetCustomerProfileQuery,
} from '../../store/customer.api';
import {useGetWorkerProfileQuery} from '../../store/worker.api';
import {logout} from '../../store/store';
import {useAppSelector} from '../../store/hooks';

const ProfileScreen = () => {
  const user = useAppSelector(state => state.auth.user);
  const isWorker = user?.role === 'WORKER';
  const customerQuery = useGetCustomerProfileQuery(undefined, {skip: isWorker});
  const workerQuery = useGetWorkerProfileQuery(undefined, {skip: !isWorker});
  const profile = isWorker ? workerQuery.data?.data : customerQuery.data?.data;
  const isLoading = isWorker ? workerQuery.isLoading : customerQuery.isLoading;
  const isError = isWorker ? workerQuery.isError : customerQuery.isError;
  const isFetching = isWorker
    ? workerQuery.isFetching
    : customerQuery.isFetching;
  const refetch = isWorker ? workerQuery.refetch : customerQuery.refetch;

  const formatDate = (value?: string) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Not available'
      : date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
  };

  return (
    <Page>
      <PageTitle
        title="My profile"
        subtitle="Your personal information and account details."
      />
      <ActionButton
        title={isFetching ? 'Refreshing...' : 'Refresh profile'}
        variant="secondary"
        onPress={() => refetch()}
        disabled={isFetching}
      />
      {isLoading ? (
        <LoadingMessage text="Loading profile..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load your profile. Please refresh and try again."
          variant="error"
        />
      ) : (
        <Card>
          <Text style={styles.name}>
            {profile?.name || user?.name || 'CarWash user'}
          </Text>
          <Text style={styles.detail}>{profile?.email || user?.email}</Text>
          {profile?.phone || user?.phone ? (
            <Text style={styles.detail}>{profile?.phone || user?.phone}</Text>
          ) : null}
          {profile?.address ? (
            <Text style={styles.detail}>
              Address: {profile.address}
            </Text>
          ) : null}
          <Text style={styles.role}>
            {isWorker ? 'Worker account' : 'Customer account'}
          </Text>
          <Text style={styles.detail}>
            Account status: {profile?.status || user?.status || 'Unknown'}
          </Text>
          <Text style={styles.detail}>
            Account created: {formatDate(profile?.createdAt)}
          </Text>
          <Text style={styles.detail}>
            Last updated: {formatDate(profile?.updatedAt)}
          </Text>
          {isWorker && profile?._id ? (
            <Text style={styles.detail}>Worker ID: {profile._id}</Text>
          ) : null}
        </Card>
      )}
      <ActionButton title="Sign out" variant="danger" onPress={() => logout()} />
    </Page>
  );
};

const styles = StyleSheet.create({
  name: {fontSize: 20, fontWeight: '800', color: colors.ink},
  detail: {fontSize: 14, color: colors.muted},
  role: {fontSize: 13, fontWeight: '700', color: colors.primary},
});

export default ProfileScreen;

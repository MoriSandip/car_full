import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  colors,
  InfoMessage,
  LoadingMessage,
  Page,
  PageTitle,
} from '../../components/mobile/ui';
import {useGetCustomerProfileQuery} from '../../store/customer.api';
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
  const name = profile?.name || user?.name || 'CarWash user';
  const email = profile?.email || user?.email || 'Not added';
  const phone = profile?.phone || user?.phone || 'Not added';
  const status = profile?.status || user?.status || 'Unknown';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  const isStatusActive = ['active', 'approved'].includes(status.toLowerCase());

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
    <Page contentStyle={styles.page}>
      <PageTitle compact
        title="My profile"
        subtitle="Your personal information and account details."
      />

      <View style={styles.profileHero}>
        <View style={styles.heroDecoration} />
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'CW'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Feather
              name={isWorker ? 'briefcase' : 'user'}
              size={13}
              color={colors.white}
            />
            <Text style={styles.roleBadgeText}>
              {isWorker ? 'WORKER' : 'CUSTOMER'}
            </Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                isStatusActive ? styles.statusDotActive : styles.statusDotOther,
              ]}
            />
            <Text style={styles.statusLabel}>
              {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
            </Text>
          </View>
          <Text style={styles.statusCaption}>ACCOUNT STATUS</Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingMessage text="Loading profile..." />
      ) : isError ? (
        <InfoMessage
          text="Could not load your profile. Please refresh and try again."
          variant="error"
        />
      ) : (
        <>
          <ProfileSection title="Personal information">
            <ProfileRow icon="mail" label="Email address" value={email} />
            <ProfileRow icon="phone" label="Phone number" value={phone} />
            {profile?.address || user?.address ? (
              <ProfileRow
                icon="map-pin"
                label="Address"
                value={profile?.address || user?.address || ''}
              />
            ) : null}
            {isWorker && profile?._id ? (
              <ProfileRow icon="hash" label="Worker ID" value={profile._id} />
            ) : null}
          </ProfileSection>

          <ProfileSection title="Account activity">
            <ProfileRow
              icon="calendar"
              label="Member since"
              value={formatDate(profile?.createdAt)}
            />
            <ProfileRow
              icon="refresh-cw"
              label="Last updated"
              value={formatDate(profile?.updatedAt)}
            />
          </ProfileSection>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => refetch()}
        disabled={isFetching}
        style={({pressed}) => [
          styles.refreshButton,
          pressed && !isFetching && styles.buttonPressed,
          isFetching && styles.buttonDisabled,
        ]}>
        <Feather
          name="refresh-cw"
          size={17}
          color={colors.primary}
          style={isFetching ? styles.refreshingIcon : undefined}
        />
        <Text style={styles.refreshText}>
          {isFetching ? 'Refreshing profile...' : 'Refresh profile'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => logout()}
        style={({pressed}) => [
          styles.signOutButton,
          pressed && styles.signOutPressed,
        ]}>
        <Feather name="log-out" size={17} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Page>
  );
};

const ProfileSection = ({
  title,
  children,
}: React.PropsWithChildren<{title: string}>) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.detailsCard}>{children}</View>
  </View>
);

const ProfileRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Feather name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  page: {paddingTop: 22, gap: 20},
  profileHero: {
    overflow: 'hidden',
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
  },
  heroDecoration: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatar: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  avatarText: {fontSize: 22, fontWeight: '800', color: colors.white},
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.white,
  },
  name: {fontSize: 23, fontWeight: '800', color: colors.white},
  email: {marginTop: 5, fontSize: 14, color: 'rgba(255,255,255,0.76)'},
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.28)',
  },
  statusIndicator: {flexDirection: 'row', alignItems: 'center', gap: 8},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  statusDotActive: {backgroundColor: '#74E3B1'},
  statusDotOther: {backgroundColor: '#F6C66A'},
  statusLabel: {fontSize: 13, fontWeight: '700', color: colors.white},
  statusCaption: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.64)',
  },
  section: {gap: 11},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.ink,
  },
  detailsCard: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  detailRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  detailCopy: {flex: 1, gap: 4},
  detailLabel: {fontSize: 12, fontWeight: '600', color: colors.muted},
  detailValue: {fontSize: 14, fontWeight: '700', color: colors.ink},
  refreshButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  refreshText: {fontSize: 14, fontWeight: '700', color: colors.primary},
  refreshingIcon: {opacity: 0.55},
  signOutButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: -7,
    borderWidth: 1,
    borderColor: '#F2D8D5',
    borderRadius: 15,
    backgroundColor: '#FFF8F7',
  },
  signOutText: {fontSize: 14, fontWeight: '700', color: colors.danger},
  buttonPressed: {opacity: 0.7},
  buttonDisabled: {opacity: 0.55},
  signOutPressed: {opacity: 0.7},
});

export default ProfileScreen;

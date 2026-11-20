import React, {PropsWithChildren} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  PressableProps,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {NavigatorParamList, ScreenName} from '../../navigators/navigation-route';
import {useAppSelector} from '../../store/hooks';
import {logout} from '../../store/store';

const palette = {
  white: '#FFFFFF',
  ink: '#172B3A',
  muted: '#647887',
  border: '#E2EAF0',
  surface: '#FFFFFF',
  canvas: '#F4F7FA',
  primary: '#087F8C',
  primaryDark: '#066A74',
  danger: '#B42318',
  success: '#13795B',
  paleBlue: '#E6F3F4',
};

export const Page = ({
  children,
  contentStyle,
  refreshControl,
  headerAction,
}: PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
  headerAction?: React.ReactNode;
}>) => (
  <PageLayout
    contentStyle={contentStyle}
    refreshControl={refreshControl}
    headerAction={headerAction}>
    {children}
  </PageLayout>
);

const customerDrawerItems: DrawerItem[] = [
  {label: 'Home', route: 'CustomerMain', icon: 'home'},
  {label: 'My bookings', route: 'CustomerBookings', icon: 'calendar'},
  {label: 'Cleaning status', route: 'CustomerStatus', icon: 'activity'},
  {label: 'Memberships', route: 'CustomerMemberships', icon: 'award'},
  {label: 'Society', route: 'CustomerSociety', icon: 'home'},
  {label: 'Flat', route: 'CustomerFlat', icon: 'grid'},
  {label: 'Car', route: 'CustomerCar', icon: 'truck'},
  {label: 'Payment history', route: 'CustomerTransactions', icon: 'credit-card'},
];

const workerDrawerItems: DrawerItem[] = [
  {label: 'Home', route: 'WorkerMain', icon: 'home'},
  {label: 'Attendance report', route: 'WorkerAttendanceReport', icon: 'clipboard'},
  {label: 'My profile', route: 'WorkerProfile', icon: 'user'},
];

type DrawerItem = {
  label: string;
  route: ScreenName;
  icon: string;
};

export const isCurrentDrawerDestination = (
  screenName: ScreenName,
  activeRoute: string,
) =>
  screenName === activeRoute ||
  (screenName === 'CustomerMain' && activeRoute === 'CustomerDashboard') ||
  (screenName === 'WorkerMain' && activeRoute === 'WorkerDashboard');

const DrawerContext = React.createContext<(routeName: string) => void>(() => {});

const screenTitles: Record<string, string> = {
  CustomerDashboard: 'Home',
  CustomerBooking: 'Book a wash',
  CustomerProfile: 'Profile',
  CustomerBookings: 'My bookings',
  CustomerTransactions: 'Payment history',
  CustomerStatus: 'Cleaning status',
  CustomerMemberships: 'Memberships',
  CustomerSociety: 'Society',
  CustomerFlat: 'Flat',
  CustomerCar: 'Car',
  WorkerDashboard: 'Home',
  WorkerJobs: 'Assigned jobs',
  WorkerAttendance: 'My attendance',
  WorkerAttendanceReport: 'Attendance report',
  WorkerProfile: 'Profile',
};

export const MobileDrawerProvider = ({children}: PropsWithChildren) => {
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('');
  const navigation = useNavigation<NavigationProp<NavigatorParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isWorker = user?.role === 'WORKER';
  const drawerItems = user?.role === 'CUSTOMER'
    ? customerDrawerItems
    : isWorker
      ? workerDrawerItems
      : [];
  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  const resetCustomerStack = (
    screenName:
      | 'CustomerBookings'
      | 'CustomerStatus'
      | 'CustomerMemberships'
      | 'CustomerSociety'
      | 'CustomerFlat'
      | 'CustomerCar'
      | 'CustomerTransactions',
  ) => {
    const homeRoute = {
      name: 'CustomerMain' as const,
      params: {screen: 'CustomerDashboard' as const},
    };
    navigation.reset({
      index: 1,
      routes: [homeRoute, {name: screenName}],
    });
  };
  const resetWorkerStack = (
    screenName: 'WorkerAttendanceReport' | 'WorkerProfile',
  ) => {
    const homeRoute = {
      name: 'WorkerMain' as const,
      params: {screen: 'WorkerDashboard' as const},
    };
    navigation.reset({
      index: 1,
      routes: [homeRoute, {name: screenName}],
    });
  };
  const navigateTo = (screenName: ScreenName) => {
    switch (screenName) {
      case 'CustomerStatus':
        resetCustomerStack('CustomerStatus');
        break;
      case 'CustomerMain':
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'CustomerMain',
              params: {screen: 'CustomerDashboard'},
            },
          ],
        });
        break;
      case 'CustomerBookings':
        resetCustomerStack('CustomerBookings');
        break;
      case 'CustomerMemberships':
        resetCustomerStack('CustomerMemberships');
        break;
      case 'CustomerSociety':
        resetCustomerStack('CustomerSociety');
        break;
      case 'CustomerFlat':
        resetCustomerStack('CustomerFlat');
        break;
      case 'CustomerCar':
        resetCustomerStack('CustomerCar');
        break;
      case 'CustomerTransactions':
        resetCustomerStack('CustomerTransactions');
        break;
      case 'WorkerAttendanceReport':
        resetWorkerStack('WorkerAttendanceReport');
        break;
      case 'WorkerMain':
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'WorkerMain',
              params: {screen: 'WorkerDashboard'},
            },
          ],
        });
        break;
      case 'WorkerProfile':
        resetWorkerStack('WorkerProfile');
        break;
    }
  };
  const navigateFromDrawer = (screenName: ScreenName) => {
    setDrawerVisible(false);
    if (isCurrentDrawerDestination(screenName, activeRoute)) return;
    requestAnimationFrame(() => navigateTo(screenName));
  };
  const isActiveDrawerItem = (screenName: ScreenName) =>
    isCurrentDrawerDestination(screenName, activeRoute);

  return (
    <DrawerContext.Provider
      value={routeName => {
        setActiveRoute(routeName);
        setDrawerVisible(true);
      }}>
      {children}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={() => setDrawerVisible(false)}
            style={styles.drawerScrim}
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{initials || 'CW'}</Text>
              </View>
              <View style={styles.drawerIdentity}>
                <Text style={styles.drawerName} numberOfLines={1}>
                  {user?.name || 'CarWash user'}
                </Text>
                <Text style={styles.drawerEmail} numberOfLines={1}>
                  {user?.email || ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
                onPress={() => setDrawerVisible(false)}
                style={styles.closeButton}>
                <Feather name="x" size={20} color={palette.ink} />
              </Pressable>
            </View>
            <Text style={styles.drawerSection}>YOUR ACCOUNT</Text>
            <View style={styles.drawerItems}>
              {drawerItems.map(item => (
                <Pressable
                  accessibilityRole="button"
                  key={item.route}
                  onPress={() => navigateFromDrawer(item.route)}
                  style={({pressed}) => [
                    styles.drawerItem,
                    isActiveDrawerItem(item.route) && styles.drawerItemActive,
                    pressed && styles.drawerItemPressed,
                  ]}>
                  <Feather
                    name={item.icon}
                    size={18}
                    color={palette.primary}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      isActiveDrawerItem(item.route) && styles.drawerItemTextActive,
                    ]}>
                    {item.label}
                  </Text>
                  <Feather name="chevron-right" size={17} color={palette.muted} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDrawerVisible(false);
                logout();
              }}
              style={styles.signOut}>
              <Feather name="log-out" size={18} color={palette.danger} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
};

const PageLayout = ({
  children,
  contentStyle,
  refreshControl,
  headerAction,
}: PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
  headerAction?: React.ReactNode;
}>) => {
  const openDrawer = React.useContext(DrawerContext);
  const route = useRoute();
  const user = useAppSelector(state => state.auth.user);
  const isWorker = user?.role === 'WORKER';
  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <SafeAreaView style={styles.safe}>
      {user ? (
        <View style={styles.appHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={() => openDrawer(route.name)}
            style={styles.menuButton}>
            <Feather name="menu" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.brandBlock}>
            <Text style={styles.brand} numberOfLines={1}>
              {screenTitles[route.name] || 'CarWash'}
            </Text>
            <Text style={styles.roleLabel}>
              {isWorker ? 'WORKER' : 'CUSTOMER'}
            </Text>
          </View>
          {headerAction ?? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'CW'}</Text>
            </View>
          )}
        </View>
      ) : null}
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[styles.page, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export const PageTitle = ({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) => (
  <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
    {!compact ? <Text style={styles.title}>{title}</Text> : null}
    {subtitle ? (
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
        {subtitle}
      </Text>
    ) : null}
  </View>
);

export const TextField = (props: TextInputProps) => (
  <TextInput
    placeholderTextColor="#8797A5"
    style={[styles.input, props.multiline && styles.multiline]}
    {...props}
  />
);

export const ActionButton = ({
  title,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: PressableProps['onPress'];
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={({pressed}) => [
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'danger' && styles.buttonDanger,
      disabled && styles.buttonDisabled,
      pressed && !disabled && styles.buttonPressed,
      style,
    ]}>
    <Text
      style={[
        styles.buttonText,
        variant === 'secondary' && styles.buttonSecondaryText,
      ]}>
      {title}
    </Text>
  </Pressable>
);

export const InfoMessage = ({
  text,
  variant = 'info',
}: {
  text: string;
  variant?: 'info' | 'error' | 'success';
}) => (
  <View
    accessibilityRole={variant === 'error' ? 'alert' : 'text'}
    style={[
      styles.message,
      variant === 'error' && styles.messageError,
      variant === 'success' && styles.messageSuccess,
    ]}>
    <Text
      style={[
        styles.messageText,
        variant === 'error' && styles.messageErrorText,
        variant === 'success' && styles.messageSuccessText,
      ]}>
      {text}
    </Text>
  </View>
);

export const LoadingMessage = ({text = 'Loading...'}: {text?: string}) => (
  <View style={styles.loading}>
    <ActivityIndicator color={palette.primary} />
    <Text style={styles.muted}>{text}</Text>
  </View>
);

export const Card = ({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const colors = palette;

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: palette.canvas},
  appHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  menuButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.canvas,
  },
  brandBlock: {flex: 1, marginLeft: 10, gap: 1},
  brand: {fontSize: 15, fontWeight: '800', color: palette.ink},
  roleLabel: {fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: palette.primary},
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: palette.paleBlue,
  },
  avatarText: {fontSize: 12, fontWeight: '800', color: palette.primaryDark},
  page: {padding: 16, paddingBottom: 28, gap: 14},
  titleBlock: {gap: 6, marginBottom: 1},
  titleBlockCompact: {gap: 0, marginBottom: -3},
  title: {fontSize: 23, fontWeight: '800', letterSpacing: -0.4, color: palette.ink},
  subtitle: {fontSize: 13, lineHeight: 18, color: palette.muted},
  subtitleCompact: {fontSize: 12, lineHeight: 16},
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 35, 48, 0.42)',
  },
  drawerScrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
  drawer: {
    width: '84%',
    maxWidth: 350,
    height: '100%',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 26,
    backgroundColor: palette.white,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerHeader: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32},
  drawerAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: palette.paleBlue,
  },
  drawerAvatarText: {fontSize: 15, fontWeight: '800', color: palette.primaryDark},
  drawerIdentity: {flex: 1, gap: 3},
  drawerName: {fontSize: 15, fontWeight: '800', color: palette.ink},
  drawerEmail: {fontSize: 12, color: palette.muted},
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.canvas,
  },
  drawerSection: {
    marginBottom: 10,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.muted,
  },
  drawerItems: {gap: 6},
  drawerItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 12,
    borderRadius: 13,
  },
  drawerItemPressed: {backgroundColor: palette.canvas},
  drawerItemActive: {backgroundColor: palette.paleBlue},
  drawerItemText: {flex: 1, fontSize: 14, fontWeight: '600', color: palette.ink},
  drawerItemTextActive: {color: palette.primaryDark, fontWeight: '800'},
  signOut: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#FFF5F4',
  },
  signOutText: {fontSize: 14, fontWeight: '700', color: palette.danger},
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: palette.surface,
    fontSize: 15,
  },
  multiline: {minHeight: 88, paddingTop: 12, textAlignVertical: 'top'},
  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  buttonDanger: {backgroundColor: palette.danger},
  buttonDisabled: {opacity: 0.5},
  buttonPressed: {opacity: 0.82},
  buttonText: {color: palette.surface, fontSize: 15, fontWeight: '700'},
  buttonSecondaryText: {color: palette.ink},
  message: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: palette.paleBlue,
  },
  messageError: {backgroundColor: '#FDECEA'},
  messageSuccess: {backgroundColor: '#E8F5EE'},
  messageText: {color: palette.primaryDark, fontSize: 13, lineHeight: 18},
  messageErrorText: {color: palette.danger},
  messageSuccessText: {color: palette.success},
  loading: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  muted: {color: palette.muted, fontSize: 14},
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
    shadowColor: '#173044',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },
});

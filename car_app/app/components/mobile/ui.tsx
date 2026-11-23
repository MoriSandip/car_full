import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
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
import { BottomSheet } from '../bottomSheet/BottomSheet';
import {
  NavigationProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {
  NavigatorParamList,
  ScreenName,
} from '../../navigators/navigation-route';
import { useAppSelector } from '../../store/hooks';
import { logout } from '../../store/store';

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

type PageProps<T> = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
  headerAction?: React.ReactNode;
  listData?: T[];
  renderListItem?: ListRenderItem<T>;
  listKeyExtractor?: (item: T, index: number) => string;
  listFooter?: React.ReactElement | null;
}>;

export const Page = <T,>({
  children,
  contentStyle,
  refreshControl,
  headerAction,
  listData,
  renderListItem,
  listKeyExtractor,
  listFooter,
}: PageProps<T>) => (
  <PageLayout
    contentStyle={contentStyle}
    refreshControl={refreshControl}
    headerAction={headerAction}
    listData={listData}
    renderListItem={renderListItem}
    listKeyExtractor={listKeyExtractor}
    listFooter={listFooter}
  >
    {children}
  </PageLayout>
);

const customerDrawerItems: DrawerItem[] = [
  { label: 'Home', route: 'CustomerMain', icon: 'home' },
  { label: 'My bookings', route: 'CustomerBookings', icon: 'calendar' },
  { label: 'Cleaning status', route: 'CustomerStatus', icon: 'activity' },
  { label: 'Memberships', route: 'CustomerMemberships', icon: 'award' },
  { label: 'Society', route: 'CustomerSociety', icon: 'home' },
  { label: 'Flat', route: 'CustomerFlat', icon: 'grid' },
  { label: 'Car', route: 'CustomerCar', icon: 'truck' },
  {
    label: 'Payment history',
    route: 'CustomerTransactions',
    icon: 'credit-card',
  },
  {
    label: 'Complaints & Support',
    route: 'CustomerSupport',
    icon: 'life-buoy',
  },
];

const workerDrawerItems: DrawerItem[] = [
  { label: 'Home', route: 'WorkerMain', icon: 'home' },
  {
    label: 'Attendance report',
    route: 'WorkerAttendanceReport',
    icon: 'clipboard',
  },
  {
    label: 'Cash transactions',
    route: 'WorkerCashTransactions',
    icon: 'dollar-sign',
  },
  { label: 'My profile', route: 'WorkerProfile', icon: 'user' },
  { label: 'Leave & payslips', route: 'WorkerLeavePayroll', icon: 'briefcase' },
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

const DrawerContext = React.createContext<(routeName: string) => void>(
  () => {},
);

const screenTitles: Record<string, string> = {
  CustomerDashboard: 'Home',
  CustomerBooking: 'Book a wash',
  CustomerProfile: 'Profile',
  CustomerBookings: 'My bookings',
  CustomerTransactions: 'Payment history',
  CustomerSupport: 'Complaints & Support',
  CustomerStatus: 'Cleaning status',
  CustomerMemberships: 'Memberships',
  CustomerSociety: 'Society',
  CustomerFlat: 'Flat',
  CustomerCar: 'Car',
  WorkerDashboard: 'Home',
  WorkerJobs: 'Assigned jobs',
  WorkerAttendance: 'My attendance',
  WorkerAttendanceReport: 'Attendance report',
  WorkerCashTransactions: 'Cash transactions',
  WorkerProfile: 'Profile',
  WorkerLeavePayroll: 'Leave & payslips',
};

export const MobileDrawerProvider = ({ children }: PropsWithChildren) => {
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('');
  const navigation = useNavigation<NavigationProp<NavigatorParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isWorker = user?.role === 'WORKER';
  const drawerItems =
    user?.role === 'CUSTOMER'
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
      | 'CustomerTransactions'
      | 'CustomerSupport',
  ) => {
    const homeRoute = {
      name: 'CustomerMain' as const,
      params: { screen: 'CustomerDashboard' as const },
    };
    navigation.reset({
      index: 1,
      routes: [homeRoute, { name: screenName }],
    });
  };
  const resetWorkerStack = (
    screenName:
      | 'WorkerAttendanceReport'
      | 'WorkerCashTransactions'
      | 'WorkerProfile'
      | 'WorkerLeavePayroll',
  ) => {
    const homeRoute = {
      name: 'WorkerMain' as const,
      params: { screen: 'WorkerDashboard' as const },
    };
    navigation.reset({
      index: 1,
      routes: [homeRoute, { name: screenName }],
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
              params: { screen: 'CustomerDashboard' },
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
      case 'CustomerSupport':
        resetCustomerStack('CustomerSupport');
        break;
      case 'WorkerAttendanceReport':
        resetWorkerStack('WorkerAttendanceReport');
        break;
      case 'WorkerCashTransactions':
        resetWorkerStack('WorkerCashTransactions');
        break;
      case 'WorkerMain':
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'WorkerMain',
              params: { screen: 'WorkerDashboard' },
            },
          ],
        });
        break;
      case 'WorkerProfile':
        resetWorkerStack('WorkerProfile');
        break;
      case 'WorkerLeavePayroll':
        resetWorkerStack('WorkerLeavePayroll');
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
      }}
    >
      {children}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
      >
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
                style={styles.closeButton}
              >
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
                  style={({ pressed }) => [
                    styles.drawerItem,
                    isActiveDrawerItem(item.route) && styles.drawerItemActive,
                    pressed && styles.drawerItemPressed,
                  ]}
                >
                  <Feather name={item.icon} size={18} color={palette.primary} />
                  <Text
                    style={[
                      styles.drawerItemText,
                      isActiveDrawerItem(item.route) &&
                        styles.drawerItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={17}
                    color={palette.muted}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDrawerVisible(false);
                logout();
              }}
              style={styles.signOut}
            >
              <Feather name="log-out" size={18} color={palette.danger} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
};

const PageLayout = <T,>({
  children,
  contentStyle,
  refreshControl,
  headerAction,
  listData,
  renderListItem,
  listKeyExtractor,
  listFooter,
}: PageProps<T>) => {
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

  const pageContent =
    listData && renderListItem ? (
      <FlatList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={listKeyExtractor}
        ListHeaderComponent={<View style={styles.pageHeader}>{children}</View>}
        ListFooterComponent={listFooter ?? undefined}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.page, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    ) : (
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[styles.page, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      {user ? (
        <View style={styles.appHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={() => openDrawer(route.name)}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.headerButtonPressed,
            ]}
          >
            <Feather name="menu" size={21} color={palette.primaryDark} />
          </Pressable>
          <View style={styles.brandBlock}>
            <View style={styles.roleRow}>
              <View style={styles.roleDot} />
              <Text style={styles.roleLabel}>
                {isWorker ? 'WORKER' : 'CUSTOMER'} PORTAL
              </Text>
            </View>
            <Text style={styles.brand} numberOfLines={1}>
              {screenTitles[route.name] || 'CarWash'}
            </Text>
          </View>
          {headerAction ?? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'CW'}</Text>
            </View>
          )}
        </View>
      ) : null}
      {pageContent}
    </SafeAreaView>
  );
};

export const PageTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.titleBlock}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

export const TextField = (props: TextInputProps) => (
  <TextInput
    placeholderTextColor="#8797A5"
    style={[styles.input, props.multiline && styles.multiline]}
    {...props}
  />
);

export const SearchFilterBar = ({
  value,
  onChangeText,
  placeholder,
  onFilterPress,
  filterAccessibilityLabel,
  hasActiveFilters,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onFilterPress: () => void;
  filterAccessibilityLabel: string;
  hasActiveFilters: boolean;
}) => (
  <View style={styles.searchFilterBar}>
    <View style={styles.searchField}>
      <Feather name="search" size={17} color={palette.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor="#8797A5"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        style={styles.searchFieldInput}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.searchClearButton}
        >
          <Feather name="x" size={15} color={palette.muted} />
        </Pressable>
      ) : null}
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filterAccessibilityLabel}
      onPress={onFilterPress}
      style={styles.searchFilterButton}
    >
      <Feather name="sliders" size={17} color={palette.white} />
      <Text style={styles.searchFilterButtonText}>Filter</Text>
      {hasActiveFilters ? <View style={styles.searchFilterDot} /> : null}
    </Pressable>
  </View>
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
    style={({ pressed }) => [
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'danger' && styles.buttonDanger,
      disabled && styles.buttonDisabled,
      pressed && !disabled && styles.buttonPressed,
      style,
    ]}
  >
    <Text
      style={[
        styles.buttonText,
        variant === 'secondary' && styles.buttonSecondaryText,
      ]}
    >
      {title}
    </Text>
  </Pressable>
);

export type FilterSheetGroup = {
  key: string;
  title: string;
  value: string;
  defaultValue: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
};

export const FilterBottomSheet = ({
  visible,
  setVisible,
  title,
  subtitle,
  groups,
  onApply,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  title: string;
  subtitle: string;
  groups: FilterSheetGroup[];
  onApply: () => void;
}) => (
  <BottomSheet visible={visible} setVisible={setVisible}>
    <View style={styles.filterSheet}>
      <View style={styles.filterSheetHeader}>
        <View style={styles.filterSheetIcon}>
          <Feather name="sliders" size={18} color={palette.primary} />
        </View>
        <View style={styles.filterSheetTitleGroup}>
          <Text style={styles.filterSheetTitle}>{title}</Text>
          <Text style={styles.filterSheetSubtitle}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={() => setVisible(false)}
          style={styles.filterCloseButton}
        >
          <Feather name="x" size={18} color={palette.ink} />
        </Pressable>
      </View>
      {groups.map(group => (
        <View key={group.key} style={styles.filterGroup}>
          <Text style={styles.filterSectionLabel}>
            {group.title.toUpperCase()}
          </Text>
          <View style={styles.filterOptions}>
            {group.options.map(option => {
              const selected = group.value === option.value;
              return (
                <Pressable
                  key={option.value || 'all'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => group.onChange(option.value)}
                  style={[
                    styles.filterOption,
                    selected && styles.filterOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selected && styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Feather
                    name={selected ? 'check-circle' : 'circle'}
                    size={19}
                    color={selected ? palette.primary : '#AAB8C2'}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View style={styles.filterActions}>
        <ActionButton
          title="Reset"
          variant="secondary"
          onPress={() =>
            groups.forEach(group => group.onChange(group.defaultValue))
          }
          style={styles.filterResetButton}
        />
        <ActionButton
          title="Apply filter"
          onPress={() => {
            onApply();
            setVisible(false);
          }}
          style={styles.filterApplyButton}
        />
      </View>
    </View>
  </BottomSheet>
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
    ]}
  >
    <Text
      style={[
        styles.messageText,
        variant === 'error' && styles.messageErrorText,
        variant === 'success' && styles.messageSuccessText,
      ]}
    >
      {text}
    </Text>
  </View>
);

export const LoadingMessage = ({ text = 'Loading...' }: { text?: string }) => (
  <View style={styles.loading}>
    <ActivityIndicator color={palette.primary} />
    <Text style={styles.muted}>{text}</Text>
  </View>
);

export const LoadingSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <View
    accessibilityRole="progressbar"
    accessibilityLabel="Loading content"
    style={styles.skeletonList}
  >
    {Array.from({ length: rows }, (_, index) => (
      <View key={index} style={styles.skeletonCard}>
        <View style={styles.skeletonHeading} />
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonShortLine]} />
      </View>
    ))}
  </View>
);

export const Card = ({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View style={[styles.card, style, styles.cardSurface]}>{children}</View>
);

export const ListItemPressable = ({
  accessibilityLabel,
  onPress,
  children,
  style,
}: PropsWithChildren<{
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={({ pressed }) => [
      styles.listItemPressable,
      pressed && styles.listItemPressed,
      style,
    ]}
  >
    {children}
  </Pressable>
);

export const DetailsSheet = ({
  visible,
  setVisible,
  title,
  children,
}: PropsWithChildren<{
  visible: boolean;
  setVisible: (visible: boolean) => void;
  title: string;
}>) => {
  if (!visible) return null;
  return (
    <BottomSheet visible setVisible={setVisible}>
      <View style={styles.detailsSheet}>
        <View style={styles.detailsSheetHeader}>
          <Text style={styles.detailsSheetTitle} numberOfLines={2}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close details"
            onPress={() => setVisible(false)}
            style={styles.detailsSheetClose}
          >
            <Feather name="x" size={19} color={palette.ink} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.detailsSheetScroll}
          contentContainerStyle={styles.detailsSheetContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

export const colors = palette;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F9' },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    borderRadius: 20,
    shadowColor: '#163344',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDEDEE',
    backgroundColor: '#F0F7F7',
  },
  headerButtonPressed: { opacity: 0.75 },
  brandBlock: { flex: 1, marginLeft: 12, gap: 2 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  brand: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: palette.ink,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.primary,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#CDE4E5',
    backgroundColor: palette.paleBlue,
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: palette.primaryDark },
  page: { padding: 16, paddingBottom: 28, gap: 12 },
  pageHeader: { width: '100%', gap: 12 },
  titleBlock: { gap: 6, marginBottom: 2 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
    color: palette.ink,
  },
  subtitle: { fontSize: 13, lineHeight: 19, color: palette.muted },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 35, 48, 0.42)',
  },
  drawerScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
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
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: palette.paleBlue,
  },
  drawerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.primaryDark,
  },
  drawerIdentity: { flex: 1, gap: 3 },
  drawerName: { fontSize: 15, fontWeight: '800', color: palette.ink },
  drawerEmail: { fontSize: 12, color: palette.muted },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.canvas,
  },
  drawerSection: {
    marginBottom: 10,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.muted,
  },
  drawerItems: { gap: 6 },
  drawerItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 12,
    borderRadius: 13,
  },
  drawerItemPressed: { backgroundColor: palette.canvas },
  drawerItemActive: { backgroundColor: palette.paleBlue },
  drawerItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
  },
  drawerItemTextActive: { color: palette.primaryDark, fontWeight: '800' },
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
  signOutText: { fontSize: 14, fontWeight: '700', color: palette.danger },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: palette.surface,
    fontSize: 15,
  },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  button: {
    minHeight: 44,
    borderRadius: 14,
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
  buttonDanger: { backgroundColor: palette.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: palette.surface, fontSize: 14, fontWeight: '700' },
  buttonSecondaryText: { color: palette.ink },
  message: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: palette.paleBlue,
  },
  messageError: { backgroundColor: '#FDECEA' },
  messageSuccess: { backgroundColor: '#E8F5EE' },
  messageText: { color: palette.primaryDark, fontSize: 13, lineHeight: 18 },
  messageErrorText: { color: palette.danger },
  messageSuccessText: { color: palette.success },
  loading: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  skeletonList: { gap: 10 },
  skeletonCard: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E9EE',
    backgroundColor: palette.white,
    shadowColor: '#173044',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  skeletonHeading: {
    width: '48%',
    height: 15,
    borderRadius: 8,
    backgroundColor: '#E8EEF2',
  },
  skeletonLine: {
    width: '88%',
    height: 11,
    borderRadius: 7,
    backgroundColor: '#EEF2F5',
  },
  skeletonShortLine: { width: '62%' },
  muted: { color: palette.muted, fontSize: 14 },
  card: {
    backgroundColor: palette.surface,
    padding: 15,
    gap: 9,
  },
  cardSurface: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E9EE',
    shadowColor: '#173044',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.065,
    shadowRadius: 10,
    elevation: 3,
  },
  listItemPressable: { borderRadius: 18 },
  listItemPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  detailsSheet: {
    maxHeight: '92%',
    minHeight: 180,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.white,
  },
  detailsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailsSheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
  },
  detailsSheetClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.canvas,
  },
  detailsSheetScroll: { flexShrink: 1 },
  detailsSheetContent: { gap: 12, paddingBottom: 8 },
  filterSheet: {
    gap: 14,
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.white,
  },
  filterSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterSheetIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: palette.paleBlue,
  },
  filterSheetTitleGroup: { flex: 1, gap: 3 },
  filterSheetTitle: { fontSize: 17, fontWeight: '800', color: palette.ink },
  filterSheetSubtitle: { fontSize: 11, lineHeight: 16, color: palette.muted },
  filterCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: palette.canvas,
  },
  filterGroup: { gap: 7 },
  filterSectionLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: palette.muted,
  },
  filterOptions: { gap: 7 },
  filterOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 13,
    backgroundColor: palette.white,
  },
  filterOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.paleBlue,
  },
  filterOptionText: { fontSize: 13, fontWeight: '600', color: palette.ink },
  filterOptionTextSelected: { color: palette.primaryDark, fontWeight: '800' },
  filterActions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  filterResetButton: { flex: 1 },
  filterApplyButton: { flex: 1.5 },
  searchFilterBar: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchField: {
    flex: 1,
    minWidth: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.white,
  },
  searchFieldInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    padding: 0,
    color: palette.ink,
    fontSize: 13,
  },
  searchClearButton: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterButton: {
    minWidth: 88,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
  searchFilterButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.white,
  },
  searchFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.white,
  },
});

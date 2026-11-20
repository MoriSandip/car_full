import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Provider} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Feather from 'react-native-vector-icons/Feather';

import {NavigatorParamList} from './navigation-route';
import {colors} from '../theme/colors';
import {store} from '../store/store';
import {restoreCredentials} from '../store/auth.slice';
import {useAppSelector} from '../store/hooks';
import {
  loadAuthCredentials,
  saveAuthCredentials,
} from '../store/secure-auth';
import AuthScreen from '../screens/mobile/auth.screen';
import CustomerHomeScreen from '../screens/mobile/customer-home.screen';
import CustomerBookingScreen from '../screens/mobile/customer-booking.screen';
import CustomerBookingsScreen from '../screens/mobile/customer-bookings.screen';
import CustomerPaymentHistoryScreen from '../screens/mobile/customer-payment-history.screen';
import CustomerStatusScreen from '../screens/mobile/customer-status.screen';
import CustomerAssetsScreen from '../screens/mobile/customer-assets.screen';
import CustomerMembershipsScreen from '../screens/mobile/customer-memberships.screen';
import WorkerHomeScreen from '../screens/mobile/worker-home.screen';
import WorkerJobsScreen from '../screens/mobile/worker-jobs.screen';
import WorkerAttendanceScreen from '../screens/mobile/worker-attendance.screen';
import WorkerAttendanceReportScreen from '../screens/mobile/worker-attendance-report.screen';
import WorkerCashTransactionsScreen from '../screens/mobile/worker-cash-transactions.screen';
import ProfileScreen from '../screens/mobile/profile.screen';
import ApiRequestUi from '../components/mobile/api-request-ui';
import PaymentReturnHandler from '../components/mobile/payment-return-handler';
import {MobileDrawerProvider} from '../components/mobile/ui';

const Stack = createStackNavigator<NavigatorParamList>();
const Tab = createBottomTabNavigator<NavigatorParamList>();

const HomeTabIcon = ({color, size}: {color: string; size: number}) => (
  <Feather name="home" color={color} size={size} />
);
const BookingTabIcon = ({color, size}: {color: string; size: number}) => (
  <Feather name="plus-circle" color={color} size={size} />
);
const ProfileTabIcon = ({color, size}: {color: string; size: number}) => (
  <Feather name="user" color={color} size={size} />
);
const JobsTabIcon = ({color, size}: {color: string; size: number}) => (
  <Feather name="briefcase" color={color} size={size} />
);
const ClockTabIcon = ({color, size}: {color: string; size: number}) => (
  <Feather name="clock" color={color} size={size} />
);

const CustomerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarItemStyle: styles.tabItem,
    }}>
    <Tab.Screen
      name="CustomerDashboard"
      component={CustomerHomeScreen}
      options={{
        title: 'Home',
        tabBarLabel: 'Home',
        tabBarIcon: HomeTabIcon,
      }}
    />
    <Tab.Screen
      name="CustomerBooking"
      component={CustomerBookingScreen}
      options={{
        title: 'Book wash',
        tabBarLabel: 'Booking',
        tabBarIcon: BookingTabIcon,
      }}
    />
    <Tab.Screen
      name="CustomerProfile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: ProfileTabIcon,
      }}
    />
  </Tab.Navigator>
);

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarItemStyle: styles.tabItem,
    }}>
    <Tab.Screen
      name="WorkerDashboard"
      component={WorkerHomeScreen}
      options={{
        title: 'Overview',
        tabBarLabel: 'Home',
        tabBarIcon: HomeTabIcon,
      }}
    />
    <Tab.Screen
      name="WorkerJobs"
      component={WorkerJobsScreen}
      options={{
        title: 'Assigned jobs',
        tabBarLabel: 'Jobs',
        tabBarIcon: JobsTabIcon,
      }}
    />
    <Tab.Screen
      name="WorkerAttendance"
      component={WorkerAttendanceScreen}
      options={{
        title: 'Punch in/out',
        tabBarLabel: 'Punch',
        tabBarIcon: ClockTabIcon,
      }}
    />
  </Tab.Navigator>
);

const CustomerFlow = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="CustomerMain" component={CustomerTabs} />
    <Stack.Screen
      name="CustomerTransactions"
      component={CustomerPaymentHistoryScreen}
    />
    <Stack.Screen name="CustomerBookings" component={CustomerBookingsScreen} />
    <Stack.Screen name="CustomerStatus" component={CustomerStatusScreen} />
    <Stack.Screen
      name="CustomerMemberships"
      component={CustomerMembershipsScreen}
    />
    <Stack.Screen name="CustomerSociety" component={CustomerAssetsScreen} />
    <Stack.Screen name="CustomerFlat" component={CustomerAssetsScreen} />
    <Stack.Screen name="CustomerCar" component={CustomerAssetsScreen} />
  </Stack.Navigator>
);

const WorkerFlow = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="WorkerMain" component={WorkerTabs} />
    <Stack.Screen
      name="WorkerAttendanceReport"
      component={WorkerAttendanceReportScreen}
    />
    <Stack.Screen
      name="WorkerCashTransactions"
      component={WorkerCashTransactionsScreen}
    />
    <Stack.Screen name="WorkerProfile" component={ProfileScreen} />
  </Stack.Navigator>
);

const AppFlow = () => {
  const {hydrated, token, user} = useAppSelector(state => state.auth);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        try {
          await AsyncStorage.removeItem('carwash.auth');
        } catch {
          console.warn('Could not clear the previous local sign-in record.');
        }
        const saved = await loadAuthCredentials();
        if (!mounted) return;
        if (!saved) {
          store.dispatch(restoreCredentials(null));
          return;
        }

        const savedUser = saved.user;
        if (
          saved.token &&
          savedUser?._id &&
          savedUser.name &&
          savedUser.email &&
          (savedUser.role === 'CUSTOMER' || savedUser.role === 'WORKER')
        ) {
          store.dispatch(
            restoreCredentials({
              token: saved.token,
              user: {
                _id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                phone: savedUser.phone,
                role: savedUser.role,
              },
            }),
          );
        } else {
          await saveAuthCredentials(null);
          store.dispatch(restoreCredentials(null));
        }
      } catch {
        console.warn('Could not securely restore saved sign-in.');
        store.dispatch(restoreCredentials(null));
      }
    };

    restore();
    return () => {
      mounted = false;
    };
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>
          Starting CarWash...
        </Text>
      </View>
    );
  }

  if (token && user?.role === 'CUSTOMER') {
    return <CustomerFlow />;
  }
  if (token && user?.role === 'WORKER') {
    return <WorkerFlow />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator = () => (
  <Provider store={store}>
    <NavigationContainer>
      <MobileDrawerProvider>
        <AppFlow />
      </MobileDrawerProvider>
    </NavigationContainer>
    <ApiRequestUi />
    <PaymentReturnHandler />
  </Provider>
);

const styles = StyleSheet.create({
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: colors.gray},
  tabBar: {
    height: 70,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingTop: 7,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 0,
    borderRadius: 23,
    elevation: 14,
    shadowColor: '#153244',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.13,
    shadowRadius: 14,
  },
  tabLabel: {fontSize: 11, fontWeight: '700', marginTop: 2},
  tabItem: {paddingVertical: 2},
});

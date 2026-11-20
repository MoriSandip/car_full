import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Provider} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';

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
import ProfileScreen from '../screens/mobile/profile.screen';
import ApiRequestUi from '../components/mobile/api-request-ui';
import PaymentReturnHandler from '../components/mobile/payment-return-handler';

const Stack = createStackNavigator<NavigatorParamList>();
const Tab = createBottomTabNavigator<NavigatorParamList>();

const CustomerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: {height: 62, paddingBottom: 8, paddingTop: 6},
    }}>
    <Tab.Screen
      name="CustomerDashboard"
      component={CustomerHomeScreen}
      options={{title: 'Home', tabBarLabel: 'Home'}}
    />
    <Tab.Screen
      name="CustomerBooking"
      component={CustomerBookingScreen}
      options={{title: 'Book wash', tabBarLabel: 'Book'}}
    />
    <Tab.Screen
      name="CustomerBookings"
      component={CustomerBookingsScreen}
      options={{title: 'My bookings', tabBarLabel: 'Bookings'}}
    />
    <Tab.Screen
      name="CustomerTransactions"
      component={CustomerPaymentHistoryScreen}
      options={{title: 'Payment history', tabBarLabel: 'Payments'}}
    />
    <Tab.Screen
      name="CustomerStatus"
      component={CustomerStatusScreen}
      options={{title: 'Cleaning status', tabBarLabel: 'Status'}}
    />
    <Tab.Screen
      name="CustomerMemberships"
      component={CustomerMembershipsScreen}
      options={{title: 'Memberships', tabBarLabel: 'Plans'}}
    />
    <Tab.Screen
      name="CustomerAssets"
      component={CustomerAssetsScreen}
      options={{title: 'My home & cars', tabBarLabel: 'My setup'}}
    />
    <Tab.Screen
      name="CustomerProfile"
      component={ProfileScreen}
      options={{title: 'Profile', tabBarLabel: 'Profile'}}
    />
  </Tab.Navigator>
);

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: {height: 62, paddingBottom: 8, paddingTop: 6},
    }}>
    <Tab.Screen
      name="WorkerDashboard"
      component={WorkerHomeScreen}
      options={{title: 'Overview', tabBarLabel: 'Overview'}}
    />
    <Tab.Screen
      name="WorkerJobs"
      component={WorkerJobsScreen}
      options={{title: 'Assigned jobs', tabBarLabel: 'My jobs'}}
    />
    <Tab.Screen
      name="WorkerAttendance"
      component={WorkerAttendanceScreen}
      options={{title: 'Punch in/out', tabBarLabel: 'Punch'}}
    />
    <Tab.Screen
      name="WorkerAttendanceReport"
      component={WorkerAttendanceReportScreen}
      options={{title: 'Attendance report', tabBarLabel: 'Report'}}
    />
    <Tab.Screen
      name="WorkerProfile"
      component={ProfileScreen}
      options={{title: 'Profile', tabBarLabel: 'Profile'}}
    />
  </Tab.Navigator>
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
    return <CustomerTabs />;
  }
  if (token && user?.role === 'WORKER') {
    return <WorkerTabs />;
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
      <AppFlow />
    </NavigationContainer>
    <ApiRequestUi />
    <PaymentReturnHandler />
  </Provider>
);

const styles = StyleSheet.create({
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: colors.gray},
});

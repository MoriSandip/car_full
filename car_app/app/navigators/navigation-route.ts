import type {NavigatorScreenParams} from '@react-navigation/native';

export type CustomerTabParamList = {
  ['CustomerDashboard']: undefined;
  ['CustomerBooking']: undefined;
  ['CustomerProfile']: undefined;
};

export type WorkerTabParamList = {
  ['WorkerDashboard']: undefined;
  ['WorkerJobs']: undefined;
  ['WorkerAttendance']: undefined;
};

export type NavigatorParamList = {
  ['OnBoardingScreen']: undefined;
  ['OnBoardingScreenTwo']: undefined;
  ['SignInScreen']: undefined;
  ['SignUpScreen']: undefined;
  ['ResetScreen']: undefined;
  ['VerifyScreen']: undefined;
  ['OtpScreen']: undefined;
  ['HomeScreen']: undefined;
  ['ProfileScreen']: undefined;
  ['NotificationScreen']: undefined;
  ['MessageScreen']: undefined;
  ['SearchScreen']: undefined;
  ['CarScreen']: undefined;
  ['rootStack']: undefined;
  ['ReviewScreen']: undefined;
  ['BookingDetailsScreen']: undefined;
  ['BookingPaymentScreen']: undefined;
  ['BookingConfirmationScreen']: undefined;
  ['BookingStatusScreen']: undefined;
  ['EditScreen']: undefined;
  ['ChatScreen']: undefined;
  ['AuthScreen']: undefined;
  ['CustomerDashboard']: undefined;
  ['CustomerMain']: NavigatorScreenParams<CustomerTabParamList> | undefined;
  ['CustomerBooking']: undefined;
  ['CustomerBookings']: undefined;
  ['CustomerTransactions']: undefined;
  ['CustomerStatus']: undefined;
  ['CustomerMemberships']: undefined;
  ['CustomerSociety']: undefined;
  ['CustomerFlat']: undefined;
  ['CustomerCar']: undefined;
  ['CustomerProfile']: undefined;
  ['WorkerDashboard']: undefined;
  ['WorkerMain']: NavigatorScreenParams<WorkerTabParamList> | undefined;
  ['WorkerJobs']: undefined;
  ['WorkerAttendance']: undefined;
  ['WorkerAttendanceReport']: undefined;
  ['WorkerCashTransactions']: undefined;
  ['WorkerProfile']: undefined;
};

export type ScreenName = keyof NavigatorParamList;

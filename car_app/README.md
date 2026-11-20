This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Car wash mobile app

The app uses Redux Toolkit and RTK Query for API requests and keeps the signed-in
role/token in AsyncStorage.

## API connection

Start the Car Wash backend on port `3000` before opening the app. The API base
URL is configured in `app/config/api.ts`:

- Android emulator: `http://10.0.2.2:3000/api/v1`
- iOS simulator: `http://localhost:3000/api/v1`
- Development builds currently use
  `http://192.168.1.18:3000/api/v1` (configured as `apiOrigin` in `app.json`)
  for physical devices on the same Wi-Fi as the backend. Change it to the
  computer's current private LAN address if DHCP changes it. HTTP is enabled
  only for Android debug builds and local-network access; Android release
  builds and production JavaScript require HTTPS.
- HTTP sends login credentials and tokens without transport encryption. Use
  this endpoint only on a trusted local network for development testing; use
  HTTPS before testing on an untrusted network or creating a release.

The mobile app calls the backend directly on port `3000`. Do not use the web
client URL `http://localhost:5173/api/v1`: port `5173` is the web development
server, and `localhost` on a phone refers to the phone itself.

## Role flows

- **Customer:** register/sign in; dashboard; society registration and
  verification tracking; flat registration/update/removal; car
  registration/update/removal; month calendar and slot booking; booking
  history, online payment and rescheduling; membership plan/offer discovery,
  purchase and payment; and profile/sign out.
- **Worker:** sign in with an administrator-created worker account; dashboard;
  monthly schedule with date-grouped jobs, assigned-job search/status filters;
  start, pause, resume, and complete actions; and profile/sign out.
- Both roles can view their profile and sign out. An expired access token takes
  the app back to sign in.

These screens call the existing backend through Redux Toolkit Query. Requests
include the current bearer token automatically. The mobile endpoints cover
`/customers/login`, `/customers/register`, `/customers/me`, `/societies/my`,
`/flats/my`, `/cars/my`, `/wash-services`, `/slots/availability`, `/bookings`,
`/workers/login`, `/workers/me`, `/workers/dashboard`, and
`/workers/assigned-bookings` (including work actions).

Customers need a verified society before registering a flat, a verified flat
before registering a car, and an active verified car plus available slots
created by the administrator before submitting a booking. Customer
verification and any server-side validation errors are shown in the app.

Membership checkout uses the server's Stripe configuration and returns to the
customer web app. After returning to the mobile app, refresh My Memberships or
My Bookings to load the webhook-confirmed payment status.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.


i dont want to hacked my system so please check below points
- Hide all api keys - check .env file and setup
- protect my admin route
- add custom 404 page not found - worng route
- unique title for every page
- a meta description on every page
-Internal links between pages
-Sitemap, submitted in search console
-robots.txt checked
-share preview image
-Alt text on every image
-spam protection on forms
-seneitze all form xss
-TEST api with - 100000 users
-Check for sql injection
-Block cross site scripting
-Add CSRF protection
-Validate file uploads - max size 5 MB
-Fix broken object-level authorization
-Add rate limiting
-All form validation - check all input validate
-Secure JWT secretes + access token + refresh token
-Turn off debug mode
-Kepp API secretes server-side
-Hash passwords securely
-Add multi-factor authentication - two type - email / phone number - otp sent and verify - SKIP
-Tighten CORS settings - SKIP
-Remove auth tokens from local storage
-Enforce  permissions server-side
-Enable Row-level security
-Verify webhooks signatures
-Check fir SSRF
-Remove exposed source maps
-Change default credentials
-Keep sensitive data out of logs
-Update vulnerabke dependancies - SKIP

-- check users access
-- add sequrity headers
-- removed unyused packaged
-- check exposed files
-- secure database
-- caching
-- load balancing
-- server proxies
-- API gate wayes
-- CI/cd - skip
-- Docker -- skip
-- api timeouts - recalled api
-- Event driven architecture
-- distributed transaction
-- dead letter queues
-- Websockets
-- long pollings
-- server sent evnets
-- database indexing
-- query optimizations
-- N+1 query
-- connection pooling
-- Read replicas
--  Deadlock
-- Garbaged collection
-- Thread safty
-- Autoscalling
-- Horizontal and vertical sacalling
-- CDN
-- Edge caching
-- cache invalidation
-- matrics
-- Alterts
-- Error bugets
-- JWt rotations
Encriotion at rest
encription in transit
-- 
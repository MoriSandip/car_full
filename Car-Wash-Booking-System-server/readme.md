# Car Wash Booking System

A simple and efficient car wash booking system.

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables) -[Technology Stack](#technology-stack)

## Description

This project is a Car Wash Booking System that allows users to book car wash services conveniently. It utilizes a MongoDB database for storing user and booking information, and JSON Web Tokens (JWT) for authentication.

### Technology Stack

- **TypeScript**: The primary programming language for its type safety and modern features.
- **Express.js**: The web framework for building the API.
- **Mongoose**: The Object Data Modeling (ODM) library for MongoDB, used for data validation and schema modeling.

## Features

- User registration and authentication
- Booking car wash services
- JWT-based authentication
- Password hashing using bcrypt

## Installation

1. Clone the repository

   ```bash
   git clone https://github.com/ekramul28/Car-Wash-Booking-System-server.git
   cd car-wash-booking-system
   ```

2. Install dependencies

   ```bash
   npm install
   ```

   or if you use yarn

   ```bash
   yarn install
   ```

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file in the root directory of your project:

```plaintext
PORT=3000
NODE_ENV=development
DATABASE_URL=your MongoDB connection string
BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET=unique-random-secret-at-least-32-characters
JWT_REFRESH_SECRET=a-different-unique-random-secret-at-least-32-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=1d
SMTP_HOST=your SMTP hostname
SMTP_PORT=587
SMTP_USER=your SMTP username
SMTP_PASSWORD=your SMTP password
SMTP_FROM=CarWash <no-reply@example.com>
STRIPE_SECRET_KEY=your Stripe secret key
STRIPE_WEBHOOK_SECRET=your Stripe webhook signing secret
APP_BASE_URL=https://your-customer-app.example.com
API_PUBLIC_URL=https://your-api.example.com
CORS_ALLOWED_ORIGINS=https://your-customer-app.example.com,https://your-admin-app.example.com
IMGBB_API_KEY=your-server-side-ImgBB-key
```

Use distinct cryptographically random JWT secrets and keep all credentials in
the server environment or a secrets manager; never commit them or expose them
through client build variables. The server refuses to start with missing,
weak, or identical JWT secrets. Set `CORS_ALLOWED_ORIGINS` to the exact
comma-separated web origins used by your deployment.

Admin, customer, and worker sign-in uses email and password and returns an
access token directly. Login is rate-limited. Password recovery continues to
use a single-use email code, so configure SMTP for password reset and email
notifications. Rotate any previously exposed ImgBB key and configure its
replacement only as `IMGBB_API_KEY` on the server.

Web and mobile sign-in also offer an OTP flow for admin, customer, and worker
accounts. Request a code with `POST /api/v1/auth/otp/request` using `role`,
`channel` (`email` or `phone`), and the registered `identifier`, then verify
with `POST /api/v1/auth/otp/verify` using those fields and the six-digit `code`.
Until an SMS/email provider is configured, non-production environments use
the fixed development code `123456`; no message is actually delivered. Login
codes expire after five minutes and are single-use, with up to five attempts.
OTP login intentionally returns HTTP 503 when `NODE_ENV=production` until a
real delivery provider is connected.
The web client requires `VITE_API_BASE_URL` to point to the HTTPS API in
production. Set `apiOrigin` in `CwApp/app.json` to that same HTTPS API origin
before building the mobile app; an empty origin is intentionally not deployable.

Individual bookings can be paid online in INR with Stripe Checkout. Configure a
Stripe webhook for `POST /api/v1/payment/stripe/webhook` and subscribe to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, and
`checkout.session.expired`, `checkout.session.async_payment_failed`, and
`charge.refunded`. The webhook must be publicly reachable; payment is
verified server-side before the booking is marked paid. Admins can also record
Cash or UPI payments for unpaid individual bookings.

The customer web app must be reachable at `APP_BASE_URL`; Stripe returns
customers to `/customer/bookings` after checkout. Keep Stripe keys only in the
server environment and use Stripe test keys and a test webhook secret during
development.

## Membership purchase and payment

Customers can view active plans and offers for their society, buy a membership
for their own verified active car, and pay online. Membership dates and price
are calculated by the server from the selected plan, optional eligible offer,
and requested start date. A membership becomes active only after successful
payment; zero-price memberships activate immediately. Customer endpoints are
`GET /api/v1/memberships/mine` and
`POST /api/v1/memberships/purchase`.
Stripe membership checkout starts at
`POST /api/v1/payment/stripe/membership-checkout`; payment verification uses
the same authenticated `/api/v1/payment/stripe/confirm` endpoint as bookings.

Admins can review transaction history at
`GET /api/v1/payment/transactions`, record Cash/UPI membership payments at
`POST /api/v1/payment/memberships/:membershipId/offline`, and refund an eligible
payment at `POST /api/v1/payment/transactions/:transactionId/refund`. Stripe
refunds are submitted to Stripe; offline refunds require a refund reference.
Completed/in-progress bookings and memberships with used or reserved washes
cannot be refunded. Refunds also update the related booking/membership and are
included in the payment transaction audit trail.

## Membership wash booking and worker assignment

Each membership wash is booked for its own date and available time slot; a
20-wash membership does not create 20 appointments without customer-selected
dates. Admins can assign a worker once from a membership booking in the booking
assignment screen using `PATCH
/api/v1/bookings/memberships/:membershipId/assign-worker`. This assigns all
upcoming, not-yet-started washes already booked for that membership and saves
the worker on the membership, so future washes booked against it are assigned
automatically. To remove the membership-wide assignment and unassign its
upcoming washes, use `PATCH
/api/v1/bookings/memberships/:membershipId/unassign-worker`. Completed and
in-progress washes are not changed. Workers see each booked wash as a separate
dated task.

## Rescheduling and notifications

Customers and admins can reschedule a booking with `PATCH
/api/v1/bookings/:id`, supplying `bookingDate`, `bookingTime`, and an available
`slotId`. The server reserves the replacement slot before changing the booking,
then releases the previous slot only after the update succeeds. Started,
completed, cancelled, and membership-out-of-period bookings cannot be
rescheduled. Configure SMTP to email customers about payment, booking status,
assignment, and reschedule events; active workers also receive assignment
emails. Notification delivery errors are logged without undoing a completed
booking or payment operation.
Do not use default or example admin credentials. Provision administrator
accounts through a trusted, access-controlled deployment process and use a
unique password.


Password recovery is available for admin, customer, and worker sign-ins. Configure
the SMTP variables above to email a single-use six-digit code. Codes expire in
10 minutes and allow up to five verification attempts.

All login endpoints (`/api/v1/auth/login`, `/api/v1/customers/login`,
`/api/v1/workers/login`, `/api/v1/auth/otp/request`, and
`/api/v1/auth/otp/verify`) allow up to five requests per IP address in a
rolling 15-minute window. Further requests receive HTTP 429 until the window
expires. The default limiter store is in-memory and is per server process; use
a shared rate-limit store for deployments running multiple server instances.

## Worker schedule

Admins assign existing bookings to workers from the web booking-assignment
screen. Workers can retrieve their paginated assignments with
`GET /api/v1/workers/assigned-bookings`; optional `from=YYYY-MM-DD` and
`toExclusive=YYYY-MM-DD` query parameters filter the schedule to a date range
whose start is included and end is excluded. The mobile app uses these filters
to display a month at a time and groups the returned jobs by date.
Workers can start a confirmed booking only at or after its scheduled date and
time in India Standard Time. The API rejects early starts with HTTP 400 and
leaves the booking unchanged.

## Slot schedule

Admins can create wash-service slots for an inclusive date range with
`POST /api/v1/slots/wash-services`, using `startDate`, `endDate`, `startTime`,
and `endTime`. The service's configured duration determines the slots generated
for every day in that range. If slots already exist for any requested day, the
request is rejected without creating slots for the other days. The legacy
single-day `date` field remains supported.

## Worker attendance

Workers can punch in once per India-local calendar day and punch out once after
punching in. Both actions require a JPEG, PNG, or WebP selfie (up to 5 MB).
Worker-only endpoints are `GET /api/v1/workers/attendance/me`,
`GET /api/v1/workers/attendance/my-history?page=1&limit=10`,
`POST /api/v1/workers/attendance/punch-in`, and
`POST /api/v1/workers/attendance/punch-out`; punch requests send
`{ "selfie": "data:image/jpeg;base64,..." }`.
The history endpoint returns only the authenticated worker's records, newest
first, with pagination metadata.

Admins can retrieve a worker-wise daily report with
`GET /api/v1/workers/attendance?date=YYYY-MM-DD` and optionally filter by
`workerId`. Active workers without a record for the selected date are reported
as absent.

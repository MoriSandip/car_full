# Car Wash Booking System
//sandip
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
For deployed environments, add `IMGBB_API_KEY` to the server's environment
variables/secrets and redeploy the API; adding it to a web or mobile client
does not enable uploads.
The mobile app currently targets a local API origin during development, so
local image uploads also require `IMGBB_API_KEY` in
`Car-Wash-Booking-System-server/.env`; a Vercel Production variable is not
available to the local server process. Restart the local API after adding it.

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

## Car QR verification

Customer-added cars remain unavailable for booking until an admin verifies
them. Verification issues a unique QR token; the customer can display that
car's QR code from the car details in the web or mobile app. The assigned
worker scans it from the task before starting work. The server validates car
ownership, verification state, booking date, booking assignment, and QR match,
then permits the start action only for the worker and car that were verified.
Editing a customer's car returns it to pending verification and invalidates
its previous QR token.

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

## Worker leave, reassignment, and payroll

Set each worker's positive `monthlySalary` from the admin worker form before
generating payroll. Workers can submit future single- or multi-day paid/unpaid
leave requests, including half-day requests for a single date. Admin approval
requires every active booking assigned to that worker during the leave range to
be reassigned to an active replacement worker. Rejected requests do not affect
payroll; approved paid/unpaid leave is included in the payroll calculation.

Admins generate payroll for a custom date range (1–62 days) after the period has
closed. The system prorates monthly salary by each calendar month's actual day
count, deducts unpaid leave and weekday absences, and adds overtime at 1.5× the
salary-derived hourly rate for recorded attendance beyond 8 hours per day.
Overlapping payroll periods are rejected. Generated payslips start as Draft,
must be approved, then can be manually marked Paid with an optional payment
reference. Workers can view their payslips in the web/mobile app; the web
version can be printed or saved as PDF.

Worker endpoints:

- `POST /api/v1/workers/leaves` and `GET /api/v1/workers/leaves/mine`
- `DELETE /api/v1/workers/leaves/:id` (pending requests only)
- `GET /api/v1/workers/payroll/mine`

Admin endpoints:

- `GET /api/v1/workers/leaves` (includes affected bookings)
- `PATCH /api/v1/workers/leaves/:id/review` with `decision`, optional `leaveType`
  and, when approving, `reassignments: [{ bookingId, workerId }]`
- `POST /api/v1/workers/payroll/generate` with `periodStart` and `periodEnd`
- `GET /api/v1/workers/payroll`
- `PATCH /api/v1/workers/payroll/:id` with `action: "approve"` or
  `action: "pay"` and optional `paymentReference`


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
The worker web Monthly Schedule and mobile Jobs tab display a month calendar
with assigned-job counts by day, month navigation, a Today shortcut, and a
time-sorted agenda for the selected date. Search and status filters update both
the calendar counts and the selected-day agenda.
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

## Reports and analytics

Admin reports are filterable by an inclusive `from`/`to` date range and optional
`societyId`; a report range can cover up to 366 calendar days.
`GET /api/v1/reports/analytics` returns booking status and daily trends,
collected/refunded transaction totals, revenue by day and transaction type,
payment provider totals, and society, service, and worker performance.
Collected revenue is based on payment transactions recorded during the selected
range; it includes both booking and membership transactions. Booking performance
uses the scheduled booking date, while revenue uses the transaction date.

`GET /api/v1/reports/bookings` returns paginated booking details for the same
filters (`page`, default 1; `limit`, default 50 and maximum 500). Both report
endpoints require administrator authentication. The web reports screen exports
the analytics summaries and all matching booking rows as CSV; booking exports
are capped at 20,000 rows per download.

## Inventory and purchasing

Inventory items and suppliers are shared catalog records, while stock balances
and stock-movement history are maintained per verified society. Items have a
unique SKU, unit, default cost, and low-stock threshold. Manual receipts,
consumption issues, and corrections are audited in an append-only ledger;
negative stock is rejected. Stock valuation uses weighted-average unit cost.

Purchase orders progress from Draft to Ordered, can be received in multiple
partial deliveries, and become Received when all ordered quantities arrive.
Every received quantity updates the society balance and creates a ledger entry.
Draft or not-yet-received orders can be cancelled. Stock adjustments and
purchase receipts are transactional, so MongoDB must run as a replica set or
sharded cluster (MongoDB Atlas supports this).

Admin endpoints under `/api/v1/inventory`:

- `GET/POST /items`, `PATCH /items/:id`
- `GET/POST /suppliers`, `PATCH /suppliers/:id`
- `GET /stock?societyId=...`, `POST /stock/adjust`
- `GET /ledger?societyId=...&page=1&limit=50`
- `GET/POST /orders?societyId=...`
- `PATCH /orders/:id/place`, `POST /orders/:id/receive`,
  `PATCH /orders/:id/cancel`

The admin inventory page includes society-level low-stock alerts, stock value,
supplier and purchase-order management, partial receiving, ledger history, and
CSV exports. Consumption is recorded manually; automatic per-wash deductions
require configured material recipes and are not enabled.

## Settings and administrator permissions

The admin Settings & Permissions page supports custom administrator roles with
per-module `view` and `manage` permissions. `manage` includes read access;
server middleware enforces permissions for API requests as well as the web
navigation. Existing administrator accounts without an assigned custom role
remain Super Admins. Only Super Admins can create, edit, or delete roles and
assign roles to administrator accounts. The API prevents removing or demoting
the last active Super Admin.

Application settings have global defaults and optional per-society overrides.
Society settings inherit each field from global defaults unless that field is
explicitly different; saving a value back to its global value removes that
override. The configuration includes the application name, support email and
phone, same-day booking availability, maximum advance booking days, and
cancellation/rescheduling cutoffs. A cutoff of zero disables the cutoff.
Booking policy settings are enforced server-side. The public endpoint
`GET /api/v1/settings/public?societyId=...` returns the effective, non-secret
settings for customer applications.

Super Admin endpoints are under `/api/v1/settings/roles` and
`/api/v1/settings/admin-users`. Admins with settings view/manage access can use
`GET /api/v1/settings/config?societyId=...`; changing or resetting settings
requires manage permission. `GET /api/v1/settings/me/access` returns the
authenticated administrator's effective permissions.

## Complaints and support tickets

Customers can create tickets from the web or mobile app, view only their own
tickets, and continue the message thread until it is closed. An optional
booking reference is accepted only when the booking belongs to the authenticated
customer. A customer reply reopens a Resolved ticket; Closed tickets cannot
receive customer replies.

Customer endpoints:

- `POST /api/v1/complaints` with `category`, `subject`, `message`, and optional
  `bookingId`
- `GET /api/v1/complaints/mine?page=1&limit=20`
- `GET /api/v1/complaints/mine/:id`
- `POST /api/v1/complaints/mine/:id/replies` with `message`

Admins can search and filter the inbox, respond to customers, and update ticket
status (`Open`, `InProgress`, `Resolved`, or `Closed`) and priority (`Low`,
`Normal`, or `High`) from the web dashboard. Admin endpoints are
`GET /api/v1/complaints`, `GET /api/v1/complaints/:id`,
`POST /api/v1/complaints/:id/replies`, and `PATCH /api/v1/complaints/:id`.

import express from 'express';
import { LinkControllers } from './payment.controller';
import auth from '../../app/middlewares/auth';
import validateRequest from '../../app/middlewares/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { StripePaymentController } from './stripe.controller';
import {
  bookingCheckoutValidationSchema,
  bookingReceiptValidationSchema,
  cashCollectionListValidationSchema,
  customerPaymentListValidationSchema,
  confirmCheckoutValidationSchema,
  membershipCheckoutValidationSchema,
  offlineBookingPaymentValidationSchema,
  offlineMembershipPaymentValidationSchema,
  paymentListValidationSchema,
  refundPaymentValidationSchema,
} from './stripe.validation';
import { z } from 'zod';
const router = express.Router();

const aamarpayCheckoutValidationSchema = z.object({
  body: z.object({
    bookingIds: z
      .array(z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid booking ID'))
      .min(1)
      .max(50),
  }),
});

router.post(
  '/amrPay',
  auth('user', 'CUSTOMER'),
  validateRequest(aamarpayCheckoutValidationSchema),
  LinkControllers.amrPayPayment,
);
router.post('/conformation', LinkControllers.afterPaymentPage);
router.post('/fail', LinkControllers.paymentFail);
router.post(
  '/stripe/booking-checkout',
  auth('CUSTOMER'),
  validateRequest(bookingCheckoutValidationSchema),
  StripePaymentController.createBookingCheckout,
);
router.post(
  '/stripe/membership-checkout',
  auth('CUSTOMER'),
  validateRequest(membershipCheckoutValidationSchema),
  StripePaymentController.createMembershipCheckout,
);
router.post(
  '/stripe/confirm',
  auth(USER_ROLE.customer),
  validateRequest(confirmCheckoutValidationSchema),
  StripePaymentController.confirmBookingCheckout,
);
router.post(
  '/bookings/:bookingId/offline',
  auth(USER_ROLE.admin),
  validateRequest(offlineBookingPaymentValidationSchema),
  StripePaymentController.recordOfflineBookingPayment,
);
router.post(
  '/memberships/:membershipId/offline',
  auth(USER_ROLE.admin),
  validateRequest(offlineMembershipPaymentValidationSchema),
  StripePaymentController.recordOfflineMembershipPayment,
);
router.get(
  '/transactions',
  auth(USER_ROLE.admin),
  validateRequest(paymentListValidationSchema),
  StripePaymentController.listPaymentTransactions,
);
router.get(
  '/my-transactions',
  auth(USER_ROLE.customer),
  validateRequest(customerPaymentListValidationSchema),
  StripePaymentController.listCustomerPaymentTransactions,
);
router.get(
  '/cash-collections',
  auth(USER_ROLE.admin),
  validateRequest(cashCollectionListValidationSchema),
  StripePaymentController.listCashCollections,
);
router.post(
  '/bookings/:bookingId/receipt-link',
  auth(USER_ROLE.customer),
  validateRequest(bookingReceiptValidationSchema),
  StripePaymentController.createCashReceiptLink,
);
router.get(
  '/receipt/:token',
  StripePaymentController.downloadCashReceipt,
);
router.post(
  '/transactions/:transactionId/refund',
  auth(USER_ROLE.admin),
  validateRequest(refundPaymentValidationSchema),
  StripePaymentController.refundPayment,
);

export const PaymentRoutes = router;

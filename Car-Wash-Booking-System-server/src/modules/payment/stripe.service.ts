import Stripe from 'stripe';
import { Types } from 'mongoose';
import config from '../../app/config';
import Booking from '../Booking/booking.model';
import { Customer } from '../Customer/customer.model';
import Membership from '../Membership/membership.model';
import { Car } from '../Car/car.model';
import { Slot } from '../slots/slots.model';
import { PaymentTransaction } from './paymentTransaction.model';
import { NotificationService } from '../Notification/notification.service';
import jwt from 'jsonwebtoken';
import { createCashReceiptPdf } from './cashReceiptPdf';
import AppError from '../../app/errors/AppError';

const stripeClient = () => {
  if (!config.stripe_secret_key) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return new Stripe(config.stripe_secret_key);
};

const appUrl = () => {
  if (!config.app_base_url) {
    throw new Error('Payment return URL is not configured. Set APP_BASE_URL.');
  }
  return config.app_base_url.replace(/\/+$/, '');
};

const readStringField = (value: unknown, key: string) => {
  if (!value || typeof value !== 'object') return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : undefined;
};

const createBookingCheckout = async (customerId: string, bookingId: string) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid customer or booking ID');
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    customerId,
    paymentType: 'Individual',
    paymentMethod: { $ne: 'Cash' },
    paymentStatus: { $in: ['Pending', 'Failed'] },
    status: { $nin: ['Cancelled', 'Completed'] },
    isDeleted: false,
  });

  if (!booking || booking.amountPayable <= 0) {
    throw new Error('Payable booking not found');
  }

  const customer = await Customer.findById(customerId).select('email');
  if (!customer) throw new Error('Customer not found');

  const stripe = stripeClient();
  const pendingTransactions = await PaymentTransaction.find({
    bookingId: booking._id,
    customerId,
    provider: 'Stripe',
    status: 'Pending',
    stripeSessionId: { $exists: true },
  }).sort({ createdAt: -1 });

  for (const transaction of pendingTransactions) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      transaction.stripeSessionId!,
    );
    if (existingSession.status === 'open' && existingSession.url) {
      return { url: existingSession.url, sessionId: existingSession.id };
    }
    if (existingSession.status === 'expired') {
      transaction.status = 'Failed';
      await transaction.save();
    }
  }

  const transaction = await PaymentTransaction.create({
    bookingId: booking._id,
    customerId,
    amount: booking.amountPayable,
    currency: 'inr',
    provider: 'Stripe',
    status: 'Pending',
  });

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: customer.email,
        client_reference_id: String(booking._id),
        metadata: {
          paymentTransactionId: String(transaction._id),
          bookingId: String(booking._id),
          customerId,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'inr',
              unit_amount: Math.round(booking.amountPayable * 100),
              product_data: {
                name: booking.serviceNameSnapshot,
                description: `Car wash booking ${String(booking._id)}`,
              },
            },
          },
        ],
        success_url: `${appUrl()}/customer/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/customer/bookings?payment=cancelled`,
      },
      { idempotencyKey: `booking-payment-${transaction._id}` },
    );

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    transaction.stripeSessionId = session.id;
    await transaction.save();
    return { url: session.url, sessionId: session.id };
  } catch (error) {
    transaction.status = 'Failed';
    await transaction.save();
    throw error;
  }
};

const createMembershipCheckout = async (
  customerId: string,
  membershipId: string,
) => {
  if (
    !Types.ObjectId.isValid(customerId) ||
    !Types.ObjectId.isValid(membershipId)
  ) {
    throw new Error('Invalid customer or membership ID');
  }

  const membership = await Membership.findOne({
    _id: membershipId,
    status: 'Pending',
    paymentStatus: { $in: ['Pending', 'Failed'] },
    isDeleted: false,
  });
  if (!membership || membership.totalAmount <= 0) {
    throw new Error('Payable pending membership not found');
  }

  const car = await Car.findOne({
    _id: membership.carId,
    createdBy: customerId,
    createdByRole: 'CUSTOMER',
    isDeleted: false,
  }).select('registrationNumber');
  if (!car) throw new Error('Membership does not belong to this customer');

  const customer = await Customer.findById(customerId).select('email');
  if (!customer) throw new Error('Customer not found');

  const stripe = stripeClient();
  const pendingTransactions = await PaymentTransaction.find({
    membershipId: membership._id,
    customerId,
    provider: 'Stripe',
    status: 'Pending',
    stripeSessionId: { $exists: true },
  }).sort({ createdAt: -1 });

  for (const transaction of pendingTransactions) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      transaction.stripeSessionId!,
    );
    if (existingSession.status === 'open' && existingSession.url) {
      return { url: existingSession.url, sessionId: existingSession.id };
    }
    if (existingSession.status === 'expired') {
      transaction.status = 'Failed';
      await transaction.save();
    }
  }

  const transaction = await PaymentTransaction.create({
    membershipId: membership._id,
    customerId,
    amount: membership.totalAmount,
    currency: 'inr',
    provider: 'Stripe',
    status: 'Pending',
  });

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: customer.email,
        client_reference_id: String(membership._id),
        metadata: {
          paymentTransactionId: String(transaction._id),
          membershipId: String(membership._id),
          customerId,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'inr',
              unit_amount: Math.round(membership.totalAmount * 100),
              product_data: {
                name: `Car wash membership - ${car.registrationNumber}`,
                description: `Membership ${String(membership._id)}`,
              },
            },
          },
        ],
        success_url: `${appUrl()}/customer/memberships?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/customer/memberships?payment=cancelled`,
      },
      { idempotencyKey: `membership-payment-${transaction._id}` },
    );

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    transaction.stripeSessionId = session.id;
    await transaction.save();
    return { url: session.url, sessionId: session.id };
  } catch (error) {
    transaction.status = 'Failed';
    await transaction.save();
    throw error;
  }
};

const applyPaidCheckoutSession = async (
  session: Stripe.Checkout.Session,
  expectedCustomerId?: string,
) => {
  const transactionId = session.metadata?.paymentTransactionId;
  if (!transactionId || !Types.ObjectId.isValid(transactionId)) {
    throw new Error('Stripe session is missing its payment reference');
  }

  const transaction = await PaymentTransaction.findOne({
    _id: transactionId,
    provider: 'Stripe',
    stripeSessionId: session.id,
    ...(expectedCustomerId
      ? { customerId: new Types.ObjectId(expectedCustomerId) }
      : {}),
  });
  if (!transaction) throw new Error('Payment transaction not found');
  if (!transaction.customerId) {
    throw new Error('Payment transaction has no customer owner');
  }

  const targetId = transaction.membershipId ?? transaction.bookingId;
  const targetMetadata = transaction.membershipId
    ? session.metadata?.membershipId
    : session.metadata?.bookingId;
  if (
    !targetId ||
    session.payment_status !== 'paid' ||
    session.currency !== transaction.currency ||
    session.amount_total !== Math.round(transaction.amount * 100) ||
    targetMetadata !== String(targetId) ||
    session.metadata?.customerId !== String(transaction.customerId)
  ) {
    throw new Error('Stripe payment does not match the booking amount or owner');
  }

  if (transaction.status === 'Paid') {
    return transaction.membershipId
      ? Membership.findById(transaction.membershipId)
      : Booking.findById(transaction.bookingId);
  }
  if (transaction.status === 'Refunded') {
    throw new Error('A refunded payment cannot be applied again');
  }

  let booking;
  if (transaction.membershipId) {
    const membership = await Membership.findOne({
      _id: transaction.membershipId,
      status: { $in: ['Pending', 'Active'] },
      paymentStatus: { $in: ['Pending', 'Failed', 'Paid'] },
      isDeleted: false,
    });
    const car = membership
      ? await Car.findOne({
          _id: membership.carId,
          createdBy: transaction.customerId,
          createdByRole: 'CUSTOMER',
          isDeleted: false,
        }).select('_id')
      : null;
    if (!membership || !car) {
      throw new Error('Pending membership for this payment was not found');
    }
    if (Math.round(membership.totalAmount * 100) !== Math.round(transaction.amount * 100)) {
      throw new Error('Membership amount changed after checkout was created');
    }
    const updatedMembership = await Membership.updateOne(
      {
        _id: membership._id,
        status: 'Pending',
        paymentStatus: { $in: ['Pending', 'Failed'] },
        isDeleted: false,
      },
      { $set: { status: 'Active', paymentStatus: 'Paid' } },
    );
    if (!updatedMembership.modifiedCount) {
      const currentMembership = await Membership.findById(membership._id);
      if (currentMembership?.paymentStatus !== 'Paid') {
        throw new Error('Membership payment could not be activated');
      }
    }
  } else {
    booking = await Booking.findOne({
      _id: transaction.bookingId,
      customerId: transaction.customerId,
      paymentType: 'Individual',
      isDeleted: false,
    });
    if (!booking) throw new Error('Booking for this payment was not found');
    if (Math.round(booking.amountPayable * 100) !== Math.round(transaction.amount * 100)) {
      throw new Error('Booking amount changed after checkout was created');
    }

    if (booking.paymentStatus !== 'Paid') {
      const updated = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          customerId: transaction.customerId,
          paymentStatus: { $ne: 'Paid' },
          isDeleted: false,
        },
        {
          $set: {
            paymentStatus: 'Paid',
            paymentMethod: 'Stripe',
            paymentReference: session.id,
          },
        },
        { new: true, runValidators: true },
      );
      if (!updated) {
        const currentBooking = await Booking.findById(booking._id);
        if (currentBooking?.paymentStatus !== 'Paid') {
          throw new Error('Booking payment could not be updated');
        }
      }
    }
  }

  transaction.status = 'Paid';
  transaction.stripePaymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  transaction.verifiedAt = new Date();
  await transaction.save();

  const paymentTargetLabel = transaction.membershipId
    ? 'membership'
    : 'booking';
  await NotificationService.sendCustomerNotification(
    transaction.customerId,
    'CarWash payment confirmed',
    `Your INR ${transaction.amount} payment for your ${paymentTargetLabel} has been confirmed.`,
  );

  return booking ?? Membership.findById(transaction.membershipId);
};

const confirmBookingCheckout = async (customerId: string, sessionId: string) => {
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  return applyPaidCheckoutSession(session, customerId);
};

const recordOfflineBookingPayment = async (
  adminId: string,
  bookingId: string,
  method: 'Cash' | 'UPI',
  reference?: string,
) => {
  if (!Types.ObjectId.isValid(bookingId)) throw new Error('Invalid booking ID');

  const unpaidStatuses = { $in: ['Pending', 'Failed'] };
  const eligibleStatuses: Record<string, unknown>[] = [
    {
      paymentStatus: unpaidStatuses,
      status: { $nin: ['Cancelled', 'Completed'] },
    },
  ];
  if (method === 'Cash') {
    eligibleStatuses.push({
      paymentStatus: unpaidStatuses,
      status: 'Completed',
      paymentMethod: 'Cash',
      cashCollectionStatus: 'NotReceived',
    });
  }
  const booking = await Booking.findOne({
    _id: bookingId,
    paymentType: 'Individual',
    $or: eligibleStatuses,
    isDeleted: false,
  });

  if (!booking || booking.amountPayable <= 0) {
    throw new Error('Unpaid individual booking not found');
  }

  const transaction = await PaymentTransaction.create({
    bookingId: booking._id,
    customerId: booking.customerId,
    amount: booking.amountPayable,
    currency: 'inr',
    provider: method,
    status: 'Pending',
    reference: reference?.trim(),
    recordedBy: new Types.ObjectId(adminId),
  });

  let updatedBooking;
  try {
    updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        $or: eligibleStatuses,
        isDeleted: false,
      },
      {
        $set: {
          paymentStatus: 'Paid',
          paymentMethod: method,
          paymentReference: reference?.trim(),
          ...(method === 'Cash'
            ? {
                cashCollectionStatus: 'Received',
                cashCollectionUpdatedAt: new Date(),
                cashCollectionUpdatedByAdmin: new Types.ObjectId(adminId),
                cashCollectionUpdatedByWorker: null,
              }
            : {}),
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedBooking) {
      transaction.status = 'Failed';
      await transaction.save();
      throw new Error('Booking payment was already recorded by another request');
    }

    transaction.status = 'Paid';
    transaction.verifiedAt = new Date();
    await transaction.save();
    await NotificationService.sendCustomerNotification(
      booking.customerId,
      'CarWash payment confirmed',
      `Your INR ${transaction.amount} payment for your booking has been recorded.`,
    );
  } catch (error) {
    if (transaction.status === 'Pending') {
      transaction.status = 'Failed';
      await transaction.save();
    }
    throw error;
  }

  return updatedBooking;
};

const recordOfflineMembershipPayment = async (
  adminId: string,
  membershipId: string,
  method: 'Cash' | 'UPI',
  reference?: string,
) => {
  if (!Types.ObjectId.isValid(membershipId)) {
    throw new Error('Invalid membership ID');
  }
  const membership = await Membership.findOne({
    _id: membershipId,
    status: 'Pending',
    paymentStatus: { $in: ['Pending', 'Failed'] },
    isDeleted: false,
  });
  if (!membership || membership.totalAmount <= 0) {
    throw new Error('Unpaid pending membership not found');
  }
  const car = await Car.findById(membership.carId).select('createdBy');
  if (!car) throw new Error('Membership car not found');

  const transaction = await PaymentTransaction.create({
    membershipId: membership._id,
    customerId: car.createdBy,
    amount: membership.totalAmount,
    currency: 'inr',
    provider: method,
    status: 'Pending',
    reference: reference?.trim(),
    recordedBy: new Types.ObjectId(adminId),
  });
  try {
    const updated = await Membership.findOneAndUpdate(
      {
        _id: membership._id,
        status: 'Pending',
        paymentStatus: { $in: ['Pending', 'Failed'] },
        isDeleted: false,
      },
      { $set: { status: 'Active', paymentStatus: 'Paid' } },
      { new: true, runValidators: true },
    );
    if (!updated) {
      throw new Error('Membership payment was already recorded by another request');
    }
    transaction.status = 'Paid';
    transaction.verifiedAt = new Date();
    await transaction.save();
    await NotificationService.sendCustomerNotification(
      car.createdBy,
      'CarWash membership payment confirmed',
      `Your INR ${transaction.amount} membership payment has been recorded. Your membership is active.`,
    );
    return updated;
  } catch (error) {
    transaction.status = 'Failed';
    await transaction.save();
    throw error;
  }
};

const listPaymentTransactions = async (filters: {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
}) => {
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(Number(filters.limit) || 20)),
  );
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.provider) query.provider = filters.provider;
  const [data, total] = await Promise.all([
    PaymentTransaction.find(query)
      .populate('bookingId')
      .populate('membershipId')
      .populate('customerId', 'name email phone')
      .populate('recordedBy', 'name email')
      .populate('recordedByWorker', 'name email')
      .populate('refundedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PaymentTransaction.countDocuments(query),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const listCustomerPaymentTransactions = async (
  customerId: string,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    from?: string;
    to?: string;
  },
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new AppError(400, 'Invalid customer ID');
  }
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit) || 20)));
  const query: Record<string, unknown> = {
    customerId: new Types.ObjectId(customerId),
  };
  if (filters.status) query.status = filters.status;
  if (filters.provider) query.provider = filters.provider;
  const createdAt: Record<string, Date> = {};
  if (filters.from) {
    createdAt.$gte = new Date(`${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    const endDate = new Date(`${filters.to}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    createdAt.$lt = endDate;
  }
  if (Object.keys(createdAt).length) query.createdAt = createdAt;

  const [data, total, totals] = await Promise.all([
    PaymentTransaction.find(query)
      .populate({
        path: 'bookingId',
        select: 'bookingDate bookingTime serviceNameSnapshot status paymentType paymentMethod',
      })
      .populate({
        path: 'membershipId',
        select: 'startDate endDate status paymentStatus totalAmount',
      })
      .populate('recordedByWorker', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PaymentTransaction.countDocuments(query),
    PaymentTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Paid'] }, '$amount', 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Pending'] }, '$amount', 0],
            },
          },
          cashPaidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$provider', 'Cash'] },
                    { $eq: ['$status', 'Paid'] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          onlinePaidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$provider', ['Stripe', 'UPI']] },
                    { $eq: ['$status', 'Paid'] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);
  return {
    data,
    summary: totals[0] ?? {
      paidAmount: 0,
      pendingAmount: 0,
      cashPaidAmount: 0,
      onlinePaidAmount: 0,
    },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const listCashCollections = async (filters: {
  page?: number;
  limit?: number;
  status?: 'NotRecorded' | 'Received' | 'NotReceived';
  from?: string;
  to?: string;
}) => {
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit) || 20)));
  const query: Record<string, unknown> = {
    paymentType: 'Individual',
    paymentMethod: 'Cash',
    isDeleted: false,
    status: { $ne: 'Cancelled' },
  };
  if (filters.status === 'NotRecorded') {
    query.$or = [
      { cashCollectionStatus: 'NotRecorded' },
      {
        cashCollectionStatus: { $exists: false },
        paymentStatus: { $ne: 'Paid' },
      },
    ];
  } else if (filters.status) {
    query.$or =
      filters.status === 'Received'
        ? [
            { cashCollectionStatus: 'Received' },
            {
              cashCollectionStatus: { $exists: false },
              paymentStatus: 'Paid',
            },
          ]
        : [{ cashCollectionStatus: filters.status }];
  }
  const bookingDate: Record<string, Date> = {};
  if (filters.from) bookingDate.$gte = new Date(`${filters.from}T00:00:00.000Z`);
  if (filters.to) {
    const endDate = new Date(`${filters.to}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    bookingDate.$lt = endDate;
  }
  if (Object.keys(bookingDate).length) query.bookingDate = bookingDate;

  const [data, total, totals] = await Promise.all([
    Booking.find(query)
      .populate('customerId', 'name email phone')
      .populate('workerId', 'name email')
      .populate('cashCollectionUpdatedByWorker', 'name email')
      .populate('cashCollectionUpdatedByAdmin', 'name email')
      .populate('carId', 'registrationNumber carNumber plateNumber')
      .sort({ bookingDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(query),
    Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          collectedAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$amountPayable', 0],
            },
          },
          outstandingAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$paymentStatus', 'Paid'] },
                    { $ne: ['$paymentStatus', 'Refunded'] },
                  ],
                },
                '$amountPayable',
                0,
              ],
            },
          },
          receivedCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$cashCollectionStatus', 'Received'] },
                    {
                      $and: [
                        { $eq: ['$paymentStatus', 'Paid'] },
                        {
                          $eq: [
                            { $ifNull: ['$cashCollectionStatus', null] },
                            null,
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          notReceivedCount: {
            $sum: { $cond: [{ $eq: ['$cashCollectionStatus', 'NotReceived'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);
  return {
    data,
    summary: totals[0] ?? {
      collectedAmount: 0,
      outstandingAmount: 0,
      receivedCount: 0,
      notReceivedCount: 0,
    },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const createCashReceiptLink = async (customerId: string, bookingId: string) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid customer or booking ID');
  }
  if (!config.jwt_access_secret || !config.api_public_url) {
    throw new Error('Receipt links are not configured');
  }
  const booking = await Booking.findOne({
    _id: bookingId,
    customerId,
    paymentType: 'Individual',
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    $or: [
      { cashCollectionStatus: 'Received' },
      { cashCollectionStatus: { $exists: false } },
    ],
    isDeleted: false,
  }).select('_id');
  if (!booking) throw new Error('Paid cash receipt was not found for this customer');
  const token = jwt.sign(
    { purpose: 'cash-receipt', bookingId, customerId },
    config.jwt_access_secret,
    { expiresIn: '10m' },
  );
  const publicUrl = new URL(config.api_public_url);
  if (
    publicUrl.protocol !== 'https:' &&
    !(config.NODE_ENV !== 'production' && publicUrl.hostname === 'localhost')
  ) {
    throw new Error('Receipt links must use HTTPS in production');
  }
  const baseUrl = publicUrl.toString().replace(/\/+$/, '');
  return {
    url: `${baseUrl}/api/v1/payment/receipt/${encodeURIComponent(token)}`,
    expiresInSeconds: 600,
  };
};

const getCashReceiptPdf = async (token: string) => {
  if (!config.jwt_access_secret) throw new Error('Receipt links are not configured');
  let payload: jwt.JwtPayload & {
    purpose?: string;
    bookingId?: string;
    customerId?: string;
  };
  try {
    payload = jwt.verify(token, config.jwt_access_secret) as typeof payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'Receipt link is invalid or has expired');
    }
    throw error;
  }
  if (
    payload.purpose !== 'cash-receipt' ||
    !payload.bookingId ||
    !payload.customerId
  ) {
    throw new Error('Invalid receipt link');
  }
  const booking = await Booking.findOne({
    _id: payload.bookingId,
    customerId: payload.customerId,
    paymentType: 'Individual',
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    $or: [
      { cashCollectionStatus: 'Received' },
      { cashCollectionStatus: { $exists: false } },
    ],
    isDeleted: false,
  })
    .populate('customerId', 'name email')
    .populate('workerId', 'name email')
    .populate('cashCollectionUpdatedByWorker', 'name email')
    .populate('cashCollectionUpdatedByAdmin', 'name email')
    .populate('carId', 'registrationNumber carNumber plateNumber');
  if (!booking) throw new Error('Paid cash receipt was not found for this customer');
  const transaction = await PaymentTransaction.findOne({
    bookingId: booking._id,
    provider: 'Cash',
    status: 'Paid',
  })
    .populate('recordedByWorker', 'name email')
    .populate('recordedBy', 'name email')
    .sort({ verifiedAt: -1, createdAt: -1 });
  if (!transaction) throw new Error('Cash payment transaction was not found');

  const serviceDate = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(booking.bookingDate);
  const paidAt = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(transaction.verifiedAt ?? transaction.createdAt);
  const pdf = createCashReceiptPdf({
    receiptId: String(transaction._id),
    bookingId: String(booking._id),
    customerName: readStringField(booking.customerId, 'name') ?? '',
    customerEmail: readStringField(booking.customerId, 'email') ?? '',
    serviceName: booking.serviceNameSnapshot,
    carRegistration:
      readStringField(booking.carId, 'registrationNumber') ??
      readStringField(booking.carId, 'carNumber') ??
      readStringField(booking.carId, 'plateNumber') ??
      '',
    serviceDate,
    serviceTime: booking.bookingTime,
    amount: transaction.amount,
    paidAt,
    collectorName:
      readStringField(booking.cashCollectionUpdatedByWorker, 'name') ??
      readStringField(booking.cashCollectionUpdatedByAdmin, 'name') ??
      readStringField(transaction.recordedByWorker, 'name') ??
      readStringField(transaction.recordedBy, 'name') ??
      '',
  });
  return { pdf, filename: `cash-receipt-${booking._id}.pdf` };
};

const refundPayment = async (
  adminId: string,
  transactionId: string,
  reason: string,
  refundReference?: string,
) => {
  if (
    !Types.ObjectId.isValid(transactionId) ||
    !Types.ObjectId.isValid(adminId)
  ) {
    throw new Error('Invalid transaction or admin ID');
  }
  const transaction = await PaymentTransaction.findById(transactionId);
  if (!transaction) throw new Error('Payment transaction not found');
  if (transaction.status === 'Refunded') return transaction;
  if (transaction.status !== 'Paid') {
    throw new Error('Only paid transactions can be refunded');
  }

  let booking;
  let membership;
  if (transaction.bookingId) {
    booking = await Booking.findOne({
      _id: transaction.bookingId,
      status: { $nin: ['Completed', 'InProgress'] },
      isDeleted: false,
    });
    if (!booking) {
      throw new Error(
        'Completed, in-progress, or deleted bookings cannot be refunded',
      );
    }
  } else if (transaction.membershipId) {
    membership = await Membership.findOne({
      _id: transaction.membershipId,
      status: 'Active',
      paymentStatus: 'Paid',
      usedWashes: 0,
      reservedWashes: 0,
      isDeleted: false,
    });
    if (!membership) {
      throw new Error(
        'Only unused memberships with no reserved washes can be refunded',
      );
    }
  }

  let providerRefundReference = refundReference?.trim();
  if (transaction.provider === 'Stripe') {
    if (!transaction.stripePaymentIntentId) {
      throw new Error('Stripe payment intent is unavailable for this refund');
    }
    const refund = await stripeClient().refunds.create(
      {
        payment_intent: transaction.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: { paymentTransactionId: String(transaction._id), reason },
      },
      { idempotencyKey: `refund-${transaction._id}` },
    );
    providerRefundReference = refund.id;
  } else if (!providerRefundReference) {
    throw new Error(
      'Enter the cash/UPI refund reference before recording a refund',
    );
  }

  const updatedTransaction = await PaymentTransaction.findOneAndUpdate(
    { _id: transaction._id, status: 'Paid' },
    {
      $set: {
        status: 'Refunded',
        refundedAt: new Date(),
        refundReference: providerRefundReference,
        refundReason: reason.trim(),
        refundedBy: new Types.ObjectId(adminId),
      },
    },
    { new: true },
  );
  if (!updatedTransaction) {
    const alreadyRefunded = await PaymentTransaction.findOne({
      _id: transaction._id,
      status: 'Refunded',
    });
    if (alreadyRefunded) return alreadyRefunded;
    throw new Error('Payment was refunded by another request');
  }

  if (booking) {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'Paid' },
      { $set: { paymentStatus: 'Refunded', status: 'Cancelled' } },
    );
    await releaseBookingSlot(booking.slotId);
  } else if (membership) {
    await Membership.updateOne(
      { _id: membership._id, paymentStatus: 'Paid' },
      { $set: { paymentStatus: 'Refunded', status: 'Cancelled' } },
    );
  }
  await NotificationService.sendCustomerNotification(
    transaction.customerId,
    'CarWash payment refunded',
    `Your INR ${transaction.amount} payment has been refunded. Reference: ${providerRefundReference}.`,
  );
  return updatedTransaction;
};

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      await applyPaidCheckoutSession(session);
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const transaction = await PaymentTransaction.findOneAndUpdate(
      { stripeSessionId: session.id, status: 'Pending' },
      { $set: { status: 'Failed' } },
      { new: true },
    );
    if (transaction?.membershipId) {
      await Membership.updateOne(
        {
          _id: transaction.membershipId,
          status: 'Pending',
          paymentStatus: 'Pending',
          isDeleted: false,
        },
        { $set: { paymentStatus: 'Failed' } },
      );
    }
  } else if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const transaction = await PaymentTransaction.findOneAndUpdate(
      { stripeSessionId: session.id, status: 'Pending' },
      { $set: { status: 'Failed' } },
      { new: true },
    );
    if (transaction?.membershipId) {
      await Membership.updateOne(
        {
          _id: transaction.membershipId,
          status: 'Pending',
          paymentStatus: 'Pending',
          isDeleted: false,
        },
        { $set: { paymentStatus: 'Failed' } },
      );
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (
      paymentIntentId &&
      charge.amount_refunded >= charge.amount
    ) {
      const transaction = await PaymentTransaction.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId, status: 'Paid' },
        {
          $set: {
            status: 'Refunded',
            refundedAt: new Date(),
            refundReference: charge.id,
            refundReason: 'Refund recorded through Stripe',
          },
        },
        { new: true },
      );
      if (transaction?.bookingId) {
        await Booking.updateOne(
          { _id: transaction.bookingId, paymentStatus: 'Paid' },
          { $set: { paymentStatus: 'Refunded', status: 'Cancelled' } },
        );
        const booking = await Booking.findById(transaction.bookingId).select('slotId');
        await releaseBookingSlot(booking?.slotId);
      } else if (transaction?.membershipId) {
        await Membership.updateOne(
          { _id: transaction.membershipId, paymentStatus: 'Paid' },
          { $set: { paymentStatus: 'Refunded', status: 'Cancelled' } },
        );
      }
      if (transaction?.customerId) {
        await NotificationService.sendCustomerNotification(
          transaction.customerId,
          'CarWash payment refunded',
          `Your INR ${transaction.amount} payment has been refunded.`,
        );
      }
    }
  }
};

const releaseBookingSlot = async (slotId?: Types.ObjectId | string) => {
  if (!slotId) return;
  await Slot.updateOne(
    { _id: slotId, isBooked: 'booked' },
    { $set: { isBooked: 'available' } },
  );
};

export const StripePaymentService = {
  stripeClient,
  createBookingCheckout,
  createMembershipCheckout,
  confirmBookingCheckout,
  recordOfflineBookingPayment,
  recordOfflineMembershipPayment,
  listPaymentTransactions,
  listCustomerPaymentTransactions,
  listCashCollections,
  createCashReceiptLink,
  getCashReceiptPdf,
  refundPayment,
  handleStripeWebhookEvent,
  applyPaidCheckoutSession,
};

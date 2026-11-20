import { Request, Response } from 'express';
import { Buffer } from 'node:buffer';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import config from '../../app/config';
import { StripePaymentService } from './stripe.service';

const createBookingCheckout = catchAsync(async (req: Request, res: Response) => {
  const result = await StripePaymentService.createBookingCheckout(
    String(req.user.sub),
    req.body.bookingId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stripe checkout created successfully',
    data: result,
  });
});

const createMembershipCheckout = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.createMembershipCheckout(
      String(req.user.sub),
      req.body.membershipId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stripe checkout created successfully',
      data: result,
    });
  },
);

const confirmBookingCheckout = catchAsync(async (req: Request, res: Response) => {
  const result = await StripePaymentService.confirmBookingCheckout(
    String(req.user.sub),
    req.body.sessionId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment verified successfully',
    data: result,
  });
});

const recordOfflineBookingPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.recordOfflineBookingPayment(
      String(req.user?.sub ?? req.user?.userId ?? ''),
      req.params.bookingId,
      req.body.method,
      req.body.reference,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Offline payment recorded successfully',
      data: result,
    });
  },
);

const recordOfflineMembershipPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.recordOfflineMembershipPayment(
      String(req.user?.sub ?? req.user?.userId ?? ''),
      req.params.membershipId,
      req.body.method,
      req.body.reference,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Offline membership payment recorded successfully',
      data: result,
    });
  },
);

const listPaymentTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.listPaymentTransactions({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status ? String(req.query.status) : undefined,
      provider: req.query.provider ? String(req.query.provider) : undefined,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment transactions retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  },
);

const listCustomerPaymentTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.listCustomerPaymentTransactions(
      String(req.user.sub),
      {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status ? String(req.query.status) : undefined,
        provider: req.query.provider ? String(req.query.provider) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
      },
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Your payment history was retrieved successfully',
      data: result.data,
      meta: { ...result.meta, summary: result.summary },
    });
  },
);

const listCashCollections = catchAsync(async (req: Request, res: Response) => {
  const result = await StripePaymentService.listCashCollections({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status
      ? (String(req.query.status) as 'NotRecorded' | 'Received' | 'NotReceived')
      : undefined,
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cash collections retrieved successfully',
    data: result.data,
    meta: { ...result.meta, summary: result.summary },
  });
});

const createCashReceiptLink = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.createCashReceiptLink(
      String(req.user.sub),
      req.params.bookingId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Cash receipt link created successfully',
      data: result,
    });
  },
);

const downloadCashReceipt = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripePaymentService.getCashReceiptPdf(req.params.token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(httpStatus.OK).send(result.pdf);
  },
);

const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await StripePaymentService.refundPayment(
    String(req.user?.sub ?? req.user?.userId ?? ''),
    req.params.transactionId,
    req.body.reason,
    req.body.refundReference,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund recorded successfully',
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  if (!config.stripe_webhook_secret) {
    throw new Error('Stripe webhook is not configured');
  }

  const signature = req.header('stripe-signature');
  if (!signature || !Buffer.isBuffer(req.body)) {
    return res.status(httpStatus.BAD_REQUEST).send('Invalid Stripe webhook');
  }

  let event: Stripe.Event;
  try {
    event = StripePaymentService.stripeClient().webhooks.constructEvent(
      req.body,
      signature,
      config.stripe_webhook_secret,
    );
  } catch {
    return res.status(httpStatus.BAD_REQUEST).send('Invalid Stripe signature');
  }

  await StripePaymentService.handleStripeWebhookEvent(event);
  return res.sendStatus(httpStatus.OK);
});

export const StripePaymentController = {
  createBookingCheckout,
  createMembershipCheckout,
  confirmBookingCheckout,
  recordOfflineBookingPayment,
  recordOfflineMembershipPayment,
  listPaymentTransactions,
  listCustomerPaymentTransactions,
  listCashCollections,
  createCashReceiptLink,
  downloadCashReceipt,
  refundPayment,
  stripeWebhook,
};

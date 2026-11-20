/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from 'http-status';
import { createPaymentLinkService } from './payment.service';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

const amrPayPayment = catchAsync(async (req, res) => {
  const userId = String(req.user?.userId ?? req.user?.sub ?? '');
  const email = String(req.user?.email ?? '');
  if (!userId || !email) {
    throw new Error('Authenticated account details are missing.');
  }
  const result = await createPaymentLinkService.amrPayPayment({
    userId,
    email,
    bookingIds: req.body.bookingIds,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'payment link get successfully ',
    data: result,
  });
});

const afterPaymentPage = catchAsync(async (req, res) => {
  const tnxId = String(req.query.tnxId ?? req.body?.tnxId ?? '');

  try {
    const paymentData = await createPaymentLinkService.afterPaymentPageDB(
      tnxId,
    );

    const { payment_processor, bank_trxid, pg_txnid, mer_txnid, payment_type } =
      paymentData;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Status</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            h1 { color: #4CAF50; }
            p { font-size: 1rem; }
            .button { text-decoration: none; padding: 10px 20px; background-color: #4CAF50; color: #fff; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payment Success</h1>
            <p><strong>Payment Processor:</strong> ${escapeHtml(payment_processor)}</p>
            <p><strong>Bank Transaction ID:</strong> ${escapeHtml(bank_trxid)}</p>
            <p><strong>PG Transaction ID:</strong> ${escapeHtml(pg_txnid)}</p>
            <p><strong>Merchant Transaction ID:</strong> ${escapeHtml(mer_txnid)}</p>
            <p><strong>Payment Type:</strong> ${escapeHtml(payment_type)}</p>
            <br>
            <a href="https://car-washing-booking-system-client.vercel.app/" class="button">Go to Homepage</a>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Status</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            h1 { color: #E74C3C; }
            p { font-size: 1rem; }
            .button { text-decoration: none; padding: 10px 20px; background-color: #3498DB; color: #fff; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Payment Failed</h1>
            <p>We encountered an error processing your payment.</p>
            <p>Please try again or contact support if the issue persists.</p>
            <br>
            <a href="https://car-washing-booking-system-client.vercel.app/" class="button">Go to Homepage</a>
          </div>
        </body>
      </html>
    `);
  }
});

const paymentFail = catchAsync(async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Status</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
          h1 { color: #E74C3C; }
          p { font-size: 1rem; }
          .button { text-decoration: none; padding: 10px 20px; background-color: #3498DB; color: #fff; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Payment Failed</h1>
          <p>We encountered an error processing your payment.</p>
          <p>Please try again or contact support if the issue persists.</p>
          <br>
          <a href="https://car-washing-booking-system-client.vercel.app/" class="button">Go to Homepage</a>
        </div>
      </body>
    </html>
  `);
});
export const LinkControllers = {
  // stripePayment,
  paymentFail,
  afterPaymentPage,
  amrPayPayment,
};

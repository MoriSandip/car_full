import nodemailer from 'nodemailer';
import config from '../../app/config';
import { Customer } from '../Customer/customer.model';

const sendNotificationEmail = async (
  recipient: string | undefined,
  subject: string,
  text: string,
) => {
  if (!recipient) return;
  const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from } = config;
  if (!smtp_host || !smtp_user || !smtp_password || !smtp_from) {
    console.warn('Email notification skipped because SMTP is not configured.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: smtp_user, pass: smtp_password },
    });
    await transporter.sendMail({ from: smtp_from, to: recipient, subject, text });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Email notification failed (${errorType}).`);
  }
};

const sendCustomerNotification = async (
  customerId: unknown,
  subject: string,
  text: string,
) => {
  try {
    const customer = await Customer.findById(customerId).select('email');
    await sendNotificationEmail(customer?.email, subject, text);
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Customer notification lookup failed (${errorType}).`);
  }
};

export const NotificationService = {
  sendNotificationEmail,
  sendCustomerNotification,
};

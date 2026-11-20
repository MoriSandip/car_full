import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import nodemailer from 'nodemailer';
import httpStatus from 'http-status';
import AppError from '../../app/errors/AppError';
import config from '../../app/config';
import { Customer } from '../Customer/customer.model';
import { Worker } from '../Worker/worker.model';
import { User } from './auth.model';
import { PasswordReset, PasswordResetRole } from './passwordReset.model';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string) => {
  if (!config.jwt_access_secret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Password reset is not configured.',
    );
  }
  return createHmac('sha256', config.jwt_access_secret)
    .update(code)
    .digest('hex');
};

const getAccount = (role: PasswordResetRole, email: string) => {
  if (role === 'ADMIN') {
    return User.findOne({
      email,
      role: 'admin',
      isDeleted: false,
      userStatus: { $ne: 'blocked' },
    });
  }
  if (role === 'CUSTOMER') {
    return Customer.findOne({ email, status: 'ACTIVE' });
  }
  return Worker.findOne({ email, status: 'ACTIVE' });
};

const sendResetCode = async (email: string, code: string) => {
  const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from } = config;
  if (!smtp_host || !smtp_user || !smtp_password || !smtp_from) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password reset email is not configured. Contact support.',
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    secure: smtp_port === 465,
    auth: { user: smtp_user, pass: smtp_password },
  });

  await transporter.sendMail({
    from: smtp_from,
    to: email,
    subject: 'Your CarWash password reset code',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your CarWash password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:5px">${code}</p><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
};

const requestPasswordReset = async (
  emailInput: string,
  role: PasswordResetRole,
) => {
  const email = emailInput.trim().toLowerCase();
  const account = await getAccount(role, email);

  if (!account) {
    return 'If an active account matches those details, a reset code has been sent.';
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await PasswordReset.findOneAndUpdate(
    { email, role },
    { codeHash: hashCode(code), expiresAt, attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await sendResetCode(email, code);

  return 'If an active account matches those details, a reset code has been sent.';
};

const resetPassword = async (
  emailInput: string,
  role: PasswordResetRole,
  code: string,
  newPassword: string,
) => {
  const email = emailInput.trim().toLowerCase();
  const reset = await PasswordReset.findOneAndUpdate(
    {
      email,
      role,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { new: true },
  );

  if (
    !reset ||
    !timingSafeEqual(
      Buffer.from(reset.codeHash, 'hex'),
      Buffer.from(hashCode(code), 'hex'),
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The reset code is invalid or expired.',
    );
  }

  const account = await getAccount(role, email);
  if (!account) {
    await PasswordReset.deleteOne({ _id: reset._id });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The reset code is invalid or expired.',
    );
  }

  const consumed = await PasswordReset.deleteOne({
    _id: reset._id,
    codeHash: reset.codeHash,
    attempts: reset.attempts,
  });
  if (consumed.deletedCount !== 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The reset code is invalid or expired.',
    );
  }

  account.password = newPassword;
  await account.save();
};

export const PasswordResetService = {
  requestPasswordReset,
  resetPassword,
};

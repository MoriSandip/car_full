import { createHash, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import AppError from '../../app/errors/AppError';
import config from '../../app/config';
import { Customer } from '../Customer/customer.model';
import { Worker } from '../Worker/worker.model';
import { User } from './auth.model';
import { LoginOtp } from './loginOtp.model';

const DEVELOPMENT_OTP = '123456';
const OTP_LIFETIME_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type TLoginOtpRequest = {
  role: 'admin' | 'customer' | 'worker';
  channel: 'email' | 'phone';
  identifier: string;
};

const normalizeIdentifier = (channel: TLoginOtpRequest['channel'], identifier: string) =>
  channel === 'email' ? identifier.trim().toLowerCase() : identifier.trim();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findAccount = async ({ role, channel, identifier }: TLoginOtpRequest) => {
  const normalizedIdentifier = normalizeIdentifier(channel, identifier);
  const field = channel === 'email' ? 'email' : 'phone';
  if (role === 'admin') {
    const value =
      channel === 'email'
        ? { $regex: `^${escapeRegex(normalizedIdentifier)}$`, $options: 'i' }
        : normalizedIdentifier;
    return User.findOne({ [field]: value, role: 'admin' });
  }
  if (role === 'customer') {
    return Customer.findOne({ [field]: normalizedIdentifier });
  }
  return Worker.findOne({ [field]: normalizedIdentifier });
};

const hashOtp = (code: string) => createHash('sha256').update(code).digest('hex');

const isAccountUnavailable = (role: TLoginOtpRequest['role'], account: {
  toObject: () => Record<string, unknown>;
}) => {
  const accountStatus = account.toObject() as {
    status?: string;
    userStatus?: string;
    isDeleted?: boolean;
  };
  return (
    accountStatus.isDeleted ||
    (role !== 'admin' && accountStatus.status !== 'ACTIVE') ||
    (role === 'admin' && accountStatus.userStatus === 'blocked')
  );
};

const maskDestination = (channel: TLoginOtpRequest['channel'], identifier: string) => {
  if (channel === 'email') {
    const [name, domain] = identifier.split('@');
    return `${name.slice(0, 1)}${'*'.repeat(Math.max(name.length - 1, 2))}@${domain}`;
  }
  return `${'*'.repeat(Math.max(identifier.length - 4, 4))}${identifier.slice(-4)}`;
};

const requestLoginOtp = async (payload: TLoginOtpRequest) => {
  if (config.NODE_ENV === 'production') {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'OTP login is not configured for production yet.',
    );
  }

  const identifier = normalizeIdentifier(payload.channel, payload.identifier);
  const account = await findAccount({ ...payload, identifier });
  if (!account) {
    throw new AppError(httpStatus.NOT_FOUND, 'No account found for that email or phone number.');
  }

  if (isAccountUnavailable(payload.role, account)) {
    throw new AppError(httpStatus.FORBIDDEN, 'This account is inactive or blocked.');
  }

  await LoginOtp.deleteMany({
    role: payload.role,
    channel: payload.channel,
    identifier,
  });
  await LoginOtp.create({
    role: payload.role,
    channel: payload.channel,
    identifier,
    userId: String(account._id),
    otpHash: hashOtp(DEVELOPMENT_OTP),
    expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });

  return {
    destination: maskDestination(payload.channel, identifier),
    developmentOtp: DEVELOPMENT_OTP,
  };
};

const verifyLoginOtp = async (
  payload: TLoginOtpRequest & { code: string },
) => {
  if (config.NODE_ENV === 'production') {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'OTP login is not configured for production yet.',
    );
  }

  const identifier = normalizeIdentifier(payload.channel, payload.identifier);
  const challenge = await LoginOtp.findOne({
    role: payload.role,
    channel: payload.channel,
    identifier,
    expiresAt: { $gt: new Date() },
  });
  if (!challenge) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'OTP is invalid or expired. Request a new code.');
  }

  const submittedHash = Buffer.from(hashOtp(payload.code), 'hex');
  const expectedHash = Buffer.from(challenge.otpHash, 'hex');
  const matches = submittedHash.length === expectedHash.length &&
    timingSafeEqual(submittedHash, expectedHash);

  if (!matches) {
    challenge.attempts += 1;
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      await challenge.deleteOne();
      throw new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many incorrect OTP attempts. Request a new code.');
    }
    await challenge.save();
    throw new AppError(httpStatus.UNAUTHORIZED, 'Incorrect OTP.');
  }

  const account = await findAccount({ ...payload, identifier });
  if (
    !account ||
    String(account._id) !== challenge.userId ||
    isAccountUnavailable(payload.role, account)
  ) {
    await challenge.deleteOne();
    throw new AppError(httpStatus.UNAUTHORIZED, 'Account could not be verified. Request a new code.');
  }

  await challenge.deleteOne();
  const userData = account.toObject() as Record<string, unknown>;
  delete userData.password;

  if (payload.role === 'admin') {
    const accessToken = jwt.sign(
      {
        userId: account._id,
        email: String(userData.email ?? ''),
        imageUrl: String(userData.imageUrl ?? ''),
        role: 'admin',
      },
      config.jwt_access_secret as string,
      { expiresIn: config.jwt_access_expires_in || '1d' },
    );
    return { accessToken, user: userData, role: 'admin' };
  }

  const role = payload.role === 'customer' ? 'CUSTOMER' : 'WORKER';
  const accessToken = jwt.sign(
    { sub: String(account._id), role, email: account.email },
    config.jwt_access_secret as string,
    { expiresIn: config.jwt_access_expires_in || '1d' },
  );
  return payload.role === 'customer'
    ? { accessToken, customer: userData, role }
    : { accessToken, worker: userData, role };
};

export const LoginOtpService = { requestLoginOtp, verifyLoginOtp };

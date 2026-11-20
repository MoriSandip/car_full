import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';

import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import { User } from '../../modules/Auth/auth.model';
import { Worker } from '../../modules/Worker/worker.model';
import { Customer } from '../../modules/Customer/customer.model';

const auth = (...requiredRoles: string[]) => {
  return catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const authorization = req.headers.authorization;

      if (!authorization) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'You are not authorized!',
        );
      }

      const token = authorization.replace(/^Bearer\s+/i, '').trim();

      let decoded: JwtPayload;

      try {
        const payload = jwt.verify(
          token,
          config.jwt_access_secret as string,
        );

        if (typeof payload === 'string') {
          throw new Error('Invalid JWT payload');
        }

        decoded = payload as JwtPayload;
      } catch {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Invalid or expired access token!',
        );
      }

      const role = String(decoded.role ?? '');

      // Validate required roles for the route.
      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(role)
      ) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You are not authorized for this resource!',
        );
      }

      // WORKER authentication.
      if (role === 'WORKER') {
        if (!decoded.sub) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Worker ID missing from access token!',
          );
        }

        const worker = await Worker.findById(decoded.sub);

        if (!worker) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Worker account not found!',
          );
        }

        if (worker.status !== 'ACTIVE') {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'Worker account is inactive!',
          );
        }

        (req as any).user = decoded;
        (req as any).worker = worker;

        return next();
      }

      // CUSTOMER authentication.
      if (role === 'CUSTOMER') {
        if (!decoded.sub) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Customer ID missing from access token!',
          );
        }

        const customer = await Customer.findById(decoded.sub);

        if (!customer) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Customer account not found!',
          );
        }

        if (customer.status !== 'ACTIVE') {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'Customer account is inactive!',
          );
        }

        (req as any).user = decoded;
        (req as any).customer = customer;

        return next();
      }

      // Existing Admin/User authentication.
      if (role !== 'admin' && role !== 'user') {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Invalid user role!',
        );
      }

      if (!decoded.userId) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'User ID missing from access token!',
        );
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'This user is not found!',
        );
      }

      if (user.isDeleted) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'This user is deleted!',
        );
      }

      if (['blocked', 'block'].includes(String(user.userStatus))) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'This user is blocked!',
        );
      }

      if (user.role !== role) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Your permissions have changed. Please sign in again.',
        );
      }

      (req as any).user = decoded;

      return next();
    },
  );
};

export default auth;

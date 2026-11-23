import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';

import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import { User } from '../../modules/Auth/auth.model';
import { Worker } from '../../modules/Worker/worker.model';
import { Customer } from '../../modules/Customer/customer.model';
import { AdminRole } from '../../modules/Settings/adminRole.model';
import {
  adminPermissionForPath,
  isSuperAdminOnlyRequest,
} from '../../modules/Settings/settings.constants';

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

      if (role === 'admin') {
        const isSuperAdmin = !user.adminRoleId;
        if (isSuperAdminOnlyRequest(req.method, req.originalUrl, req.body)) {
          if (!isSuperAdmin) {
            throw new AppError(
              httpStatus.FORBIDDEN,
              'Only a Super Admin can manage administrator roles and access.',
            );
          }
        } else if (
          req.method !== 'GET' ||
          !req.originalUrl.split('?')[0].endsWith('/settings/me/access')
        ) {
          if (!isSuperAdmin) {
            const adminRole = await AdminRole.findOne({
              _id: user.adminRoleId,
              isActive: true,
            }).select('permissions');
            if (!adminRole) {
              throw new AppError(
                httpStatus.FORBIDDEN,
                'Your administrator role is inactive. Contact a Super Admin.',
              );
            }
            const module = adminPermissionForPath(req.originalUrl);
            const permission = module
              ? adminRole.permissions?.[module]
              : undefined;
            const allowed =
              req.method === 'GET'
                ? permission?.view || permission?.manage
                : permission?.manage;
            if (!allowed) {
              throw new AppError(
                httpStatus.FORBIDDEN,
                'Your administrator role does not allow this action.',
              );
            }
          }
          const requestPath = req.originalUrl.split('?')[0].replace(/^\/api\/v\d+/, '');
          const updateBody =
            typeof req.body === 'object' && req.body !== null
              ? (req.body as Record<string, unknown>)
              : undefined;
          const changesSuperAdminState =
            requestPath.startsWith('/user/') &&
            req.method === 'PATCH' &&
            ((typeof updateBody?.role === 'string' &&
              updateBody.role !== 'admin') ||
              ['blocked', 'block'].includes(String(updateBody?.userStatus)));
          if (changesSuperAdminState) {
            const targetUserId = requestPath.split('/').at(-1);
            const target = targetUserId
              ? await User.findById(targetUserId).select('role adminRoleId')
              : null;
            if (target?.role === 'admin' && !target.adminRoleId) {
              if (!isSuperAdmin) {
                throw new AppError(
                  httpStatus.FORBIDDEN,
                  'Only a Super Admin can change a Super Admin account.',
                );
              }
              const otherActiveSuperAdmins = await User.countDocuments({
                _id: { $ne: target._id },
                role: 'admin',
                isDeleted: { $ne: true },
                userStatus: { $nin: ['blocked', 'block'] },
                adminRoleId: null,
              });
              if (otherActiveSuperAdmins === 0) {
                throw new AppError(
                  httpStatus.CONFLICT,
                  'At least one active Super Admin must remain in the system.',
                );
              }
            }
          }
        }
      }

      (req as any).user = decoded;

      return next();
    },
  );
};

export default auth;

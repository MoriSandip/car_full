import express from 'express';
import { UserControllers } from './auth.controller';
import validateRequest from '../../app/middlewares/validateRequest';
import { UserValidation } from './auth.validation';
import auth from '../../app/middlewares/auth';
import { USER_ROLE } from './auth.constant';
import { PasswordResetControllers } from './passwordReset.controller';
import { PasswordResetValidation } from './passwordReset.validation';
import loginRateLimiter from '../../app/middlewares/loginRateLimiter';
import { LoginOtpControllers } from './loginOtp.controller';
import { LoginOtpValidation } from './loginOtp.validation';
// import { UserService } from './auth.service';
const route = express.Router();

route.post(
  '/signup',
  auth(USER_ROLE.admin),
  validateRequest(UserValidation.userValidationSchema),
  UserControllers.createUser,
);
route.post(
  '/login',
  loginRateLimiter,
  validateRequest(UserValidation.loginValidationSchema),
  UserControllers.loginUser,
);
route.post(
  '/otp/request',
  loginRateLimiter,
  validateRequest(LoginOtpValidation.loginOtpRequestValidationSchema),
  LoginOtpControllers.requestLoginOtp,
);
route.post(
  '/otp/verify',
  loginRateLimiter,
  validateRequest(LoginOtpValidation.loginOtpVerifyValidationSchema),
  LoginOtpControllers.verifyLoginOtp,
);
route.post(
  '/password/forgot',
  loginRateLimiter,
  validateRequest(PasswordResetValidation.requestPasswordResetValidationSchema),
  PasswordResetControllers.requestPasswordReset,
);
route.post(
  '/password/reset',
  loginRateLimiter,
  validateRequest(PasswordResetValidation.resetPasswordValidationSchema),
  PasswordResetControllers.resetPassword,
);
route.get('/', auth(USER_ROLE.admin), UserControllers.getAllUser);
// route.post(
//   '/refresh-token',
//   // validateRequest(AuthValidation.refreshTokenValidationSchema),
//   UserService.refreshToken,
// );

export const authRoutes = route;

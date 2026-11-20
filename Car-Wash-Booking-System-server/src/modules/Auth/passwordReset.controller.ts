import httpStatus from 'http-status';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import { PasswordResetService } from './passwordReset.service';

const requestPasswordReset = catchAsync(async (req, res) => {
  const message = await PasswordResetService.requestPasswordReset(
    req.body.email,
    req.body.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await PasswordResetService.resetPassword(
    req.body.email,
    req.body.role,
    req.body.code,
    req.body.newPassword,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully. You can now sign in.',
    data: null,
  });
});

export const PasswordResetControllers = {
  requestPasswordReset,
  resetPassword,
};

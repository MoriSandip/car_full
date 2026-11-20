import httpStatus from 'http-status';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import { LoginOtpService } from './loginOtp.service';

const requestLoginOtp = catchAsync(async (req, res) => {
  const result = await LoginOtpService.requestLoginOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Development OTP prepared for ${result.destination}.`,
    data: result,
  });
});

const verifyLoginOtp = catchAsync(async (req, res) => {
  const result = await LoginOtpService.verifyLoginOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Login successful.',
    data: result,
  });
});

export const LoginOtpControllers = { requestLoginOtp, verifyLoginOtp };

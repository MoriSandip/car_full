import httpStatus from 'http-status';
import sendResponse from '../../app/utils/sendResponse';
import catchAsync from '../../app/utils/catchAsync';
import { UserService } from './auth.service';
import checkDataFound from '../../app/utils/checkDataFound';

const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUserIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${req.body?.role} is created successfully`,
    data: result,
  });
});
const getAllUser = catchAsync(async (req, res) => {
  const result = await UserService.getAllUserIntoDB();
  if (!checkDataFound(result, res)) return;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'allUser get successfully',
    data: result,
  });
});
const loginUser = catchAsync(async (req, res) => {
  const result = await UserService.loginUserIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Login successful.',
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const UserControllers = {
  createUser,
  loginUser,
  getAllUser,
};

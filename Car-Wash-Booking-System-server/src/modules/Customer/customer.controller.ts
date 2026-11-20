 import httpStatus from 'http-status';
 import { CustomerServices } from './customer.service';
 import catchAsync from '../../app/utils/catchAsync';
 import sendResponse from '../../app/utils/sendResponse';
 import jwt from 'jsonwebtoken';
 import config from '../../app/config';

const registerCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.registerCustomerIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Customer Registered Successfully',
    data: customer,
  });
});

const customerLogin = catchAsync(async (req, res) => {
  const { customer, customerData } =
    await CustomerServices.customerLoginFromDB(req.body.email, req.body.password);
  const accessToken = jwt.sign(
    {
      sub: String(customer._id),
      role: 'CUSTOMER',
      email: customer.email,
    },
    config.jwt_access_secret as string,
    { expiresIn: config.jwt_access_expires_in || '1d' },
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Login successful.',
    data: { accessToken, customer: customerData, role: 'CUSTOMER' },
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  // Assumes your auth middleware sets req.user.sub from the JWT.
  const customerId = String(req.user?.sub ?? '');

  if (!customerId) {
    const error = new Error('Customer authentication required') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.UNAUTHORIZED;
    throw error;
  }

  const customer = await CustomerServices.getMyCustomerProfile(customerId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer Profile Retrieved Successfully',
    data: customer,
  });
});

const createCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.registerCustomerIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Customer Created Successfully',
    data: customer,
  });
});

const getAllCustomers = catchAsync(async (_req, res) => {
  const customers = await CustomerServices.getAllCustomersFromDB();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customers Retrieved Successfully',
    data: customers,
  });
});

const getSingleCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.getSingleCustomerFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer Retrieved Successfully',
    data: customer,
  });
});

const updateCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.updateCustomerInDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer Updated Successfully',
    data: customer,
  });
});

const deleteCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.deleteCustomerFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer Deleted Successfully',
    data: customer,
  });
});

export const CustomerControllers = {
  registerCustomer,
  customerLogin,
  getMyProfile,
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};
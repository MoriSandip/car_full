import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Customer } from './customer.model';
import { TCustomer } from './customer.interface';
import mongoose from 'mongoose';
import { ImageUploadService } from '../Upload/imageUpload.service';

const registerCustomerIntoDB = async (
  payload: Pick<TCustomer, 'name' | 'email' | 'phone' | 'password' | 'address'> & {
    profileImage?: {
      image: string;
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    };
  },
) => {
  const email = payload.email.trim().toLowerCase();
  const phone = payload.phone.trim();

  const existingCustomer = await Customer.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingCustomer) {
    const error = new Error(
      existingCustomer.email === email
        ? 'Email is already registered'
        : 'Phone number is already registered',
    ) as Error & { statusCode?: number };

    error.statusCode = httpStatus.CONFLICT;
    throw error;
  }

  const imageUrl = payload.profileImage
    ? (
        await ImageUploadService.uploadImage(
          payload.profileImage.image,
          payload.profileImage.mimeType,
        )
      ).url
    : '';

  // Role and status are not taken from the public request.
  const customer = await Customer.create({
    name: payload.name.trim(),
    email,
    phone,
    password: payload.password,
    address: payload.address ?? '',
    imageUrl,
    status: 'ACTIVE',
  });

  const { password: _password, ...customerData } = customer.toObject();
  void _password;

  return customerData;
};

const customerLoginFromDB = async (email: string, password: string) => {
  const customer = await Customer.findOne({
    email: email.trim().toLowerCase(),
  }).select('+password');

  if (!customer) {
    const error = new Error('Invalid email or password') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.UNAUTHORIZED;
    throw error;
  }

  if (customer.status !== 'ACTIVE') {
    const error = new Error('Your account is inactive. Contact Admin.') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.FORBIDDEN;
    throw error;
  }

  const passwordMatched = await bcrypt.compare(password, customer.password);

  if (!passwordMatched) {
    const error = new Error('Invalid email or password') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.UNAUTHORIZED;
    throw error;
  }

  const { password: _password, ...customerData } = customer.toObject();
  void _password;

  return {
    customer,
    customerData,
  };
};

const getMyCustomerProfile = async (customerId: string) => {
  const customer = await Customer.findById(customerId).select('-password');

  if (!customer) {
    const error = new Error('Customer not found') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  return customer;
};

const getAllCustomersFromDB = async () => {
  return Customer.find().select('-password').sort({ createdAt: -1 });
};

const getSingleCustomerFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid customer ID') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  const customer = await Customer.findById(id).select('-password');
  if (!customer) {
    const error = new Error('Customer not found') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  return customer;
};

const updateCustomerInDB = async (
  id: string,
  payload: Partial<Omit<TCustomer, 'password'>>,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid customer ID') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  const customer = await Customer.findById(id);
  if (!customer) {
    const error = new Error('Customer not found') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  const email = payload.email?.trim().toLowerCase();
  const phone = payload.phone?.trim();
  if (email || phone) {
    const duplicate = await Customer.findOne({
      _id: { $ne: id },
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (duplicate) {
      const error = new Error(
        duplicate.email === email
          ? 'Email is already registered'
          : 'Phone number is already registered',
      ) as Error & { statusCode?: number };
      error.statusCode = httpStatus.CONFLICT;
      throw error;
    }
  }

  if (payload.name !== undefined) customer.name = payload.name.trim();
  if (email) customer.email = email;
  if (phone) customer.phone = phone;
  if (payload.address !== undefined) customer.address = payload.address.trim();
  if (payload.imageUrl !== undefined) customer.imageUrl = payload.imageUrl;
  if (payload.status !== undefined) customer.status = payload.status;

  await customer.save();
  return customer;
};

const deleteCustomerFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid customer ID') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.BAD_REQUEST;
    throw error;
  }

  const customer = await Customer.findByIdAndDelete(id).select('-password');
  if (!customer) {
    const error = new Error('Customer not found') as Error & {
      statusCode?: number;
    };
    error.statusCode = httpStatus.NOT_FOUND;
    throw error;
  }

  return customer;
};

export const CustomerServices = {
  registerCustomerIntoDB,
  customerLoginFromDB,
  getMyCustomerProfile,
  getAllCustomersFromDB,
  getSingleCustomerFromDB,
  updateCustomerInDB,
  deleteCustomerFromDB,
};
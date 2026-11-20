import mongoose from 'mongoose';
import { CUSTOMER_STATUS } from './customer.constant';

export type TCustomer = {
  _id?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  status: keyof typeof CUSTOMER_STATUS;
  address?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
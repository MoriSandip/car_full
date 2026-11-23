import { USER_ROLE } from './auth.constant';
import mongoose from 'mongoose';

export type TUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  imageUrl: string;
  role: 'admin' | 'user' | 'worker' | 'customer';
  address: string;
  isDeleted: boolean;
  userStatus: 'in-progress' | 'blocked';
  adminRoleId?: mongoose.Types.ObjectId | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TLoginUser = {
  email: string;
  password: string;
};

export type TUserRole = keyof typeof USER_ROLE;

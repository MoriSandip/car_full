import { USER_ROLE } from './auth.constant';

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
  createdAt?: string;
  updatedAt?: string;
};

export type TLoginUser = {
  email: string;
  password: string;
};

export type TUserRole = keyof typeof USER_ROLE;

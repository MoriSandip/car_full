import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type AppRole = 'CUSTOMER' | 'WORKER';

export type AppUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  imageUrl?: string;
  role: AppRole;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthState = {
  token: string | null;
  user: AppUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{token: string; user: AppUser}>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hydrated = true;
    },
    restoreCredentials: (
      state,
      action: PayloadAction<{token: string; user: AppUser} | null>,
    ) => {
      state.token = action.payload?.token ?? null;
      state.user = action.payload?.user ?? null;
      state.hydrated = true;
    },
    clearCredentials: state => {
      state.token = null;
      state.user = null;
      state.hydrated = true;
    },
  },
});

export const {setCredentials, restoreCredentials, clearCredentials} =
  authSlice.actions;
export default authSlice.reducer;

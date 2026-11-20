import {configureStore} from '@reduxjs/toolkit';
import authReducer, {clearCredentials} from './auth.slice';
import {api} from './api';
import {saveAuthCredentials} from './secure-auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(api.middleware),
});

let lastSerializedAuth = '';
let writeSequence = 0;
let storageQueue = Promise.resolve();
store.subscribe(() => {
  const {token, user} = store.getState().auth;
  const serialized =
    token && user ? JSON.stringify({token, user}) : '';
  if (serialized === lastSerializedAuth) return;
  lastSerializedAuth = serialized;
  const sequence = ++writeSequence;
  storageQueue = storageQueue
    .then(async () => {
      if (sequence !== writeSequence) return;
      await saveAuthCredentials(token && user ? {token, user} : null);
    })
    .catch(() => {
      console.warn('Could not securely update saved sign-in.');
    });
});

export const logout = async () => {
  store.dispatch(clearCredentials());
  store.dispatch(api.util.resetApiState());
  await saveAuthCredentials(null);
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

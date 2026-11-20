import * as Keychain from 'react-native-keychain';
import type {AppUser} from './auth.slice';

const SERVICE = 'com.carwash.auth';

const isAppUser = (value: unknown): value is AppUser =>
  typeof value === 'object' &&
  value !== null &&
  '_id' in value &&
  typeof value._id === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'email' in value &&
  typeof value.email === 'string' &&
  'role' in value &&
  (value.role === 'CUSTOMER' || value.role === 'WORKER');

export const saveAuthCredentials = async (
  credentials: {token: string; user: AppUser} | null,
) => {
  if (!credentials) {
    await Keychain.resetGenericPassword({service: SERVICE});
    return;
  }

  const saved = await Keychain.setGenericPassword(
    'carwash-auth',
    JSON.stringify(credentials),
    {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
  if (!saved) {
    throw new Error('Secure credential storage is unavailable.');
  }
};

export const loadAuthCredentials = async () => {
  const credentials = await Keychain.getGenericPassword({service: SERVICE});
  if (!credentials) return null;

  try {
    const parsed: unknown = JSON.parse(credentials.password);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'token' in parsed &&
      typeof parsed.token === 'string' &&
      'user' in parsed &&
      isAppUser(parsed.user)
    ) {
      return {token: parsed.token, user: parsed.user};
    }
    await Keychain.resetGenericPassword({service: SERVICE});
    return null;
  } catch {
    await Keychain.resetGenericPassword({service: SERVICE});
    return null;
  }
};

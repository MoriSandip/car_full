import {Platform} from 'react-native';
import appConfig from '../../app.json';

const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;
const configuredOrigin =
  typeof appConfig.apiOrigin === 'string' ? appConfig.apiOrigin.trim() : '';
const developmentOrigin = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const API_ORIGIN = configuredOrigin || (isDevelopment ? developmentOrigin : '');

if (API_ORIGIN) {
  const parsedOrigin = new URL(API_ORIGIN);
  const isLoopback =
    parsedOrigin.hostname === 'localhost' ||
    parsedOrigin.hostname === '127.0.0.1' ||
    parsedOrigin.hostname === '10.0.2.2';
  if (
    parsedOrigin.protocol !== 'https:' &&
    !(isDevelopment && isLoopback)
  ) {
    throw new Error('The mobile app API origin must use HTTPS.');
  }
}

export const API_BASE_URL = API_ORIGIN
  ? `${API_ORIGIN.replace(/\/+$/, '')}/api/v1`
  : '';

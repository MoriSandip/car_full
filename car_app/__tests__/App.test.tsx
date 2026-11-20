/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly'},
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactModule = require('react');
  const navigator = {
    Navigator: ({children}: {children: React.ReactNode}) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    Screen: () => null,
  };
  return {createBottomTabNavigator: () => navigator};
});

jest.mock('@react-navigation/stack', () => {
  const ReactModule = require('react');
  const navigator = {
    Navigator: ({children}: {children: React.ReactNode}) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    Screen: () => null,
  };
  return {createStackNavigator: () => navigator};
});

import App from '../App';

test('renders correctly', async () => {
  let renderer: ReturnType<typeof ReactTestRenderer.create> | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  expect(renderer).toBeDefined();
}, 20000);

jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('../app/store/store', () => ({logout: jest.fn()}));

import {isCurrentDrawerDestination} from '../app/components/mobile/ui';

describe('drawer route selection', () => {
  it('does not re-navigate to the current stack screen', () => {
    expect(isCurrentDrawerDestination('CustomerStatus', 'CustomerStatus')).toBe(
      true,
    );
    expect(
      isCurrentDrawerDestination('CustomerStatus', 'CustomerMemberships'),
    ).toBe(false);
  });

  it('treats the Home drawer item as active only on the Home tab', () => {
    expect(
      isCurrentDrawerDestination('CustomerMain', 'CustomerDashboard'),
    ).toBe(true);
    expect(
      isCurrentDrawerDestination('CustomerMain', 'CustomerBooking'),
    ).toBe(false);
    expect(isCurrentDrawerDestination('WorkerMain', 'WorkerDashboard')).toBe(
      true,
    );
  });
});

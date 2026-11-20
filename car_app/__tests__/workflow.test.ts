import {singleDayAvailabilityRange} from '../app/utils/availability-range';
import {
  canPerformBookingWorkAction,
  canPerformWorkAction,
} from '../app/store/worker-workflow';
import type {WorkerAttendance} from '../app/store/types';

describe('worker attendance workflow', () => {
  const actions = ['start', 'stop', 'resume', 'done'] as const;
  const punchedIn: WorkerAttendance = {
    _id: 'attendance-1',
    dateKey: '2026-11-02',
    punchInAt: '2026-11-02T03:30:00.000Z',
    punchInSelfie: 'selfie',
  };

  it('allows every work transition only during an active punch-in', () => {
    actions.forEach(action => {
      expect(canPerformWorkAction(punchedIn, action)).toBe(true);
      expect(canPerformWorkAction(null, action)).toBe(false);
      expect(
        canPerformWorkAction(
          {...punchedIn, punchOutAt: '2026-11-02T12:00:00.000Z'},
          action,
        ),
      ).toBe(false);
    });
  });
});

describe('worker booking-date workflow', () => {
  const booking = {
    bookingDate: '2026-11-05T00:00:00.000Z',
    bookingTime: '10:00',
  };

  it('blocks starting and continuing yesterday’s booking today', () => {
    const now = new Date('2026-11-06T05:30:00.000Z');

    expect(canPerformBookingWorkAction(booking, 'start', now)).toBe(false);
    expect(canPerformBookingWorkAction(booking, 'stop', now)).toBe(false);
    expect(canPerformBookingWorkAction(booking, 'resume', now)).toBe(false);
    expect(canPerformBookingWorkAction(booking, 'done', now)).toBe(false);
  });

  it('allows booking-date actions only from the scheduled time', () => {
    expect(
      canPerformBookingWorkAction(
        booking,
        'start',
        new Date('2026-11-05T04:29:00.000Z'),
      ),
    ).toBe(false);
    expect(
      canPerformBookingWorkAction(
        booking,
        'start',
        new Date('2026-11-05T04:30:00.000Z'),
      ),
    ).toBe(true);
    expect(
      canPerformBookingWorkAction(
        booking,
        'stop',
        new Date('2026-11-05T04:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('single-day availability range', () => {
  it('handles the empty date before a day is selected', () => {
    expect(singleDayAvailabilityRange('')).toEqual({from: '', to: ''});
  });

  it('uses the selected day as the inclusive start and the next day as the exclusive end', () => {
    expect(singleDayAvailabilityRange('2026-11-30')).toEqual({
      from: '2026-11-30',
      to: '2026-12-01',
    });
  });

  it('handles leap days', () => {
    expect(singleDayAvailabilityRange('2028-02-29')).toEqual({
      from: '2028-02-29',
      to: '2028-03-01',
    });
  });
});

import {inclusiveBookingDates} from '../app/utils/booking-date-range';

describe('booking date ranges', () => {
  it('includes both endpoints across month and year boundaries', () => {
    expect(inclusiveBookingDates('2026-12-30', '2027-01-03')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });

  it('returns no dates for a missing or reversed range', () => {
    expect(inclusiveBookingDates('', '2026-12-31')).toEqual([]);
    expect(inclusiveBookingDates('2027-01-02', '2027-01-01')).toEqual([]);
  });
});

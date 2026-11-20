import type {Booking, WorkerAttendance} from './types';

export type WorkAction = 'start' | 'stop' | 'resume' | 'done';

export const canPerformWorkAction = (
  attendance: WorkerAttendance | null | undefined,
  action: WorkAction,
) =>
  ['start', 'stop', 'resume', 'done'].includes(action) &&
  Boolean(attendance?.punchInAt && !attendance.punchOutAt);

const indiaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
};

const scheduledStartTime = (booking: Pick<Booking, 'bookingDate' | 'bookingTime'>) => {
  const date = new Date(booking.bookingDate);
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(booking.bookingTime);
  if (Number.isNaN(date.getTime()) || !time) return null;

  return (
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(time[1]),
      Number(time[2]),
    ) -
    (5 * 60 + 30) * 60_000
  );
};

export const canPerformBookingWorkAction = (
  booking: Pick<Booking, 'bookingDate' | 'bookingTime'>,
  action: WorkAction,
  now: number | Date = Date.now(),
) => {
  const scheduledAt = scheduledStartTime(booking);
  if (scheduledAt === null) return false;

  const currentTime = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(currentTime.getTime())) return false;
  if (!isBookingWorkDate(booking, currentTime)) {
    return false;
  }

  return action !== 'start' || scheduledAt <= currentTime.getTime();
};

export const isBookingWorkDate = (
  booking: Pick<Booking, 'bookingDate' | 'bookingTime'>,
  now: number | Date = Date.now(),
) => {
  const scheduledAt = scheduledStartTime(booking);
  const currentTime = now instanceof Date ? now : new Date(now);

  return (
    scheduledAt !== null &&
    !Number.isNaN(currentTime.getTime()) &&
    indiaDateKey(new Date(scheduledAt)) === indiaDateKey(currentTime)
  );
};

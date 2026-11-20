const INDIA_UTC_OFFSET_MINUTES = 5 * 60 + 30;

export const getScheduledDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduledAtUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
  );

  return new Date(scheduledAtUtc - INDIA_UTC_OFFSET_MINUTES * 60_000);
};

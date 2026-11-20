export const inclusiveBookingDates = (startDate: string, endDate: string) => {
  if (!startDate || !endDate || startDate > endDate) return [];

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  const dates: string[] = [];

  while (current.getTime() <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

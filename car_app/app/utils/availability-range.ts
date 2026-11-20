export const singleDayAvailabilityRange = (date: string) => {
  if (!date) {
    return {from: date, to: date};
  }

  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    from: date,
    to: nextDate.toISOString().slice(0, 10),
  };
};

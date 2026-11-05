/**
 * Small date/time helpers. Times of day are "HH:MM" strings in the server's local
 * time zone. (The real backend will store UTC plus each user's time zone.)
 */

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const isTimeOfDay = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** "YYYY-MM-DD" for a date, in local time. */
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** A Date for a local day + time of day. */
export const atLocal = (day: string, hhmm: string) => {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
};

export const addDays = (day: string, n: number) => {
  const date = atLocal(day, '12:00');
  date.setDate(date.getDate() + n);
  return localDate(date);
};

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

import type { UTCString } from '@/types';

/** Combine a UTC calendar date ("YYYY-MM-DD") and time ("HH:MM") into an ISO-8601 UTC string. */
export function toUtcIso(date: string, time: string): UTCString {
  const iso = `${date}T${time}:00.000Z`;
  if (Number.isNaN(Date.parse(iso))) {
    throw new RangeError(`Invalid UTC date/time: ${date} ${time}`);
  }
  return new Date(iso).toISOString();
}

/** Format an ISO UTC timestamp for display, always labelled with the time standard. */
export function formatUtc(iso: UTCString): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
}

/** Advance an ISO UTC timestamp by a number of milliseconds. */
export function addMilliseconds(iso: UTCString, ms: number): UTCString {
  return new Date(Date.parse(iso) + ms).toISOString();
}

/** "MM-DD" label (UTC) used on timeline axes. */
export function formatUtcMonthDay(iso: UTCString): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Calendar time helpers for ICS workflow (local time).
 */

export function addMinutes(d: Date, mins: number): Date {
  const out = new Date(d);
  out.setTime(out.getTime() + mins * 60 * 1000);
  return out;
}

/** Next business day (Mon–Fri) at 10:00 local time. */
export function nextBusinessDayAt10Local(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(10, 0, 0, 0);
  return d;
}

/** Same calendar day as date d at 17:00 local time. */
export function sameDayAt17Local(d: Date): Date {
  const out = new Date(d);
  out.setHours(17, 0, 0, 0);
  return out;
}

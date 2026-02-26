/**
 * Calendar time helpers. Prefer *Local* helpers for workflow/ICS (10:00 and 17:00 local).
 * UTC helpers remain for other features (e.g. in-app schedule buttons, seed data).
 */

/** Next business day (Mon–Fri) at 09:00 UTC. */
export function nextBusinessDayAt9Utc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(9, 0, 0, 0);
  return d;
}

/** Next business day at 10:00 UTC (visit start). */
export function nextBusinessDayAt10Utc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(10, 0, 0, 0);
  return d;
}

/** Next business day at 11:00 UTC. */
export function nextBusinessDayAt11Utc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(11, 0, 0, 0);
  return d;
}

/** Today (or tomorrow if past) at 17:00 UTC. */
export function todayOrTomorrowAt17Utc(): Date {
  const d = new Date();
  d.setUTCHours(17, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(17, 0, 0, 0);
  }
  return d;
}

export function toIso(d: Date): string {
  return d.toISOString();
}

export function addMinutes(d: Date, mins: number): Date {
  const out = new Date(d);
  out.setTime(out.getTime() + mins * 60 * 1000);
  return out;
}

/** Start and end of today in UTC (00:00:00.000 to 23:59:59.999). */
export function getTodayRangeUtc(): { startIso: string; endIso: string } {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(-1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Same calendar day as date d at 17:00 UTC (for expense reminder). */
export function sameDayAt17Utc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(17, 0, 0, 0);
  return out;
}

/** Next business day (Mon–Fri) at 10:00 local time (for ICS visit start). */
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

/** Same calendar day as date d at 17:00 local time (for ICS expense reminder). */
export function sameDayAt17Local(d: Date): Date {
  const out = new Date(d);
  out.setHours(17, 0, 0, 0);
  return out;
}

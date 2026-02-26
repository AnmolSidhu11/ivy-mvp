/**
 * Build a single ICS (iCalendar) string with multiple VEVENTs.
 * DTSTAMP in UTC (Z). DTSTART/DTEND as floating local time (no Z) for correct display.
 * No external dependencies; safe for missing fields.
 */

export type IcsEventInput = {
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  uid?: string;
};

/** UTC format for DTSTAMP: YYYYMMDDTHHmmssZ */
export function formatDtstampUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/** Floating local time for DTSTART/DTEND: YYYYMMDDTHHmmss (no Z). */
export function formatFloatingLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function foldLine(line: string, maxLen = 75): string {
  if (line.length <= maxLen) return line + "\r\n";
  let out = "";
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + maxLen);
    out += chunk + "\r\n";
    i += maxLen;
    if (i < line.length) out += " ";
  }
  return out;
}

/**
 * Returns a single ICS string (VCALENDAR with multiple VEVENTs).
 * DTSTAMP in UTC (Z). DTSTART/DTEND as floating local time (no Z).
 */
export function buildIcsCalendar(events: IcsEventInput[]): string {
  const now = formatDtstampUtc(new Date());
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sanofi Expense Demo//EN\r\n";

  for (const e of events) {
    const uid = e.uid ?? `evt-${e.start.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
    const summary = escapeIcsText(e.summary ?? "Event");
    const description = e.description ? escapeIcsText(e.description) : "";
    const location = e.location ? escapeIcsText(e.location) : "";

    ics += "BEGIN:VEVENT\r\n";
    ics += foldLine(`UID:${uid}`);
    ics += foldLine(`DTSTAMP:${now}`);
    ics += foldLine(`DTSTART:${formatFloatingLocal(e.start)}`);
    ics += foldLine(`DTEND:${formatFloatingLocal(e.end)}`);
    ics += foldLine(`SUMMARY:${summary}`);
    if (description) ics += foldLine(`DESCRIPTION:${description}`);
    if (location) ics += foldLine(`LOCATION:${location}`);
    ics += "END:VEVENT\r\n";
  }

  ics += "END:VCALENDAR\r\n";
  return ics;
}

/**
 * Trigger download of an ICS file with the given content and filename.
 */
export function downloadIcs(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import type { VisitSummary } from "./mockVisits";
import type { Note } from "./notesRepo";

export type TimelineType = "Pre-call" | "Visit" | "Post-call" | "Expense" | "Note";

export type ClaimStatus = "Draft" | "Submitted" | "In Review" | "Approved" | "Rejected";

export interface DayClaim {
  id: string;
  visitId?: string;
  status: ClaimStatus;
  updatedAtIso: string;
}

export interface TimelineItem {
  id: string;
  type: TimelineType;
  startIso: string;
  endIso: string;
  timeLabel: string;
  hcpName?: string;
  location?: string;
  visitId?: string;
  claimId?: string;
  noteId?: string;
  status?: string;
  primaryAction: { label: string; href: string };
}

function toLocalTimeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function atLocalTime(dateYmd: string, hours: number, minutes: number): Date {
  const d = new Date(dateYmd + "T00:00:00");
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Normalize a visit date string to YYYY-MM-DD (local date matching). */
export function normalizeDateYmd(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.indexOf("T") !== -1) return s.slice(0, 10);
  return s;
}

/** Get Monday YYYY-MM-DD of the week containing dateYmd. */
export function getWeekStartMonday(dateYmd: string): string {
  const d = new Date(dateYmd + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

/** Get [Mon, Tue, ..., Sun] as YYYY-MM-DD for the week containing dateYmd. */
export function getWeekDates(dateYmd: string): string[] {
  const monday = getWeekStartMonday(dateYmd);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + "T00:00:00");
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dayNum}`);
  }
  return out;
}

/** Year-month "YYYY-MM". */
export function getMonthGrid(yearMonth: string): (string | null)[] {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return [];
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const daysInMonth = last.getDate();
  const firstWeekday = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${y}-${mm}-${dd}`);
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }
  return cells;
}

/** Local minutes from midnight (0–1439) from an ISO date string. */
export function localMinutesFromMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Duration in minutes from startIso to endIso (local). */
export function durationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.round((end - start) / (60 * 1000));
}

export function deriveAgendaItems(
  dateYmd: string,
  visits: VisitSummary[],
  claims: DayClaim[],
  notes: Note[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const normalizedSelected = normalizeDateYmd(dateYmd);

  const visitsForDay = visits.filter(
    (v) => normalizeDateYmd(v.date) === normalizedSelected,
  );

  for (const v of visitsForDay) {
    const visitStart = atLocalTime(dateYmd, 10, 0);
    const visitEnd = new Date(visitStart.getTime() + 30 * 60 * 1000);

    const preStart = new Date(visitStart.getTime() - 30 * 60 * 1000);
    const preEnd = new Date(preStart.getTime() + 15 * 60 * 1000);

    const postStart = new Date(visitEnd.getTime() + 30 * 60 * 1000);
    const postEnd = new Date(postStart.getTime() + 15 * 60 * 1000);

    const expenseStart = atLocalTime(dateYmd, 17, 0);
    const expenseEnd = new Date(expenseStart.getTime() + 10 * 60 * 1000);

    const claimForVisit = claims.find((c) => c.visitId === v.id);

    const base = `/visit/${v.id}`;
    items.push(
      {
        id: `${v.id}-precall`,
        type: "Pre-call",
        startIso: preStart.toISOString(),
        endIso: preEnd.toISOString(),
        timeLabel: toLocalTimeLabel(preStart),
        hcpName: v.hcpName,
        visitId: v.id,
        status: "Planned",
        primaryAction: { label: "Open pre-call brief", href: `${base}#precall` },
      },
      {
        id: `${v.id}-visit`,
        type: "Visit",
        startIso: visitStart.toISOString(),
        endIso: visitEnd.toISOString(),
        timeLabel: toLocalTimeLabel(visitStart),
        hcpName: v.hcpName,
        visitId: v.id,
        status: v.status,
        primaryAction: { label: "Capture notes", href: `${base}#capture` },
      },
      {
        id: `${v.id}-postcall`,
        type: "Post-call",
        startIso: postStart.toISOString(),
        endIso: postEnd.toISOString(),
        timeLabel: toLocalTimeLabel(postStart),
        hcpName: v.hcpName,
        visitId: v.id,
        status: "Planned",
        primaryAction: { label: "Draft post-call summary", href: `${base}#postcall` },
      },
      {
        id: `${v.id}-expense`,
        type: "Expense",
        startIso: expenseStart.toISOString(),
        endIso: expenseEnd.toISOString(),
        timeLabel: toLocalTimeLabel(expenseStart),
        hcpName: v.hcpName,
        visitId: v.id,
        claimId: claimForVisit?.id,
        status: claimForVisit?.status ?? "Not submitted",
        primaryAction: claimForVisit
          ? { label: "View claim", href: `/claim/${encodeURIComponent(claimForVisit.id)}` }
          : {
              label: "Submit expense",
              href: `/expense?date=${dateYmd}&visitId=${encodeURIComponent(v.id)}`,
            },
      },
    );
  }

  const notesForDay = notes.filter((n) => n.dateYmd === dateYmd);

  for (const note of notesForDay) {
    const start = atLocalTime(dateYmd, 12, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    items.push({
      id: note.id,
      type: "Note",
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      timeLabel: toLocalTimeLabel(start),
      hcpName: note.hcpName,
      visitId: note.visitId,
      noteId: note.id,
      status: "Note",
      primaryAction: { label: "Open note", href: "" },
    });
  }

  items.sort((a, b) => a.startIso.localeCompare(b.startIso));

  return items;
}

/** Day claims + counts; load from localStorage (client-only). */
export interface DayClaimsSummary {
  claims: DayClaim[];
  counts: {
    total: number;
    draft: number;
    submitted: number;
    inReview: number;
    approved: number;
    rejected: number;
  };
}

const EMPTY_CLAIMS_COUNTS: DayClaimsSummary["counts"] = {
  total: 0,
  draft: 0,
  submitted: 0,
  inReview: 0,
  approved: 0,
  rejected: 0,
};

/** Load all claims from localStorage (expense-demo:claims). Returns empty on server. */
export function loadAllClaims(): Array<DayClaim & { dateYmd: string }> {
  if (typeof window === "undefined") return [];
  let rawClaims: unknown[] = [];
  try {
    const raw = window.localStorage.getItem("expense-demo:claims");
    if (raw) rawClaims = JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }
  const out: Array<DayClaim & { dateYmd: string }> = [];
  for (const raw of rawClaims) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as { id?: string; updatedAt?: string; visitId?: string; status?: string };
    const { id, updatedAt, visitId, status } = c;
    if (!id || !updatedAt || typeof updatedAt.slice !== "function") continue;
    const dateYmd = updatedAt.slice(0, 10);
    const normalizedStatus =
      status === "Draft" ||
      status === "Submitted" ||
      status === "In Review" ||
      status === "Approved" ||
      status === "Rejected"
        ? status
        : "Draft";
    out.push({
      id,
      visitId,
      status: normalizedStatus,
      updatedAtIso: updatedAt,
      dateYmd,
    });
  }
  return out;
}

/** Load claims for dateYmd from localStorage (expense-demo:claims). Returns empty on server. */
export function loadDayClaims(
  dateYmd: string,
  visits: VisitSummary[],
): DayClaimsSummary {
  if (typeof window === "undefined") {
    return { claims: [], counts: { ...EMPTY_CLAIMS_COUNTS } };
  }
  let rawClaims: unknown[] = [];
  try {
    const raw = window.localStorage.getItem("expense-demo:claims");
    if (raw) rawClaims = JSON.parse(raw) as unknown[];
  } catch {
    rawClaims = [];
  }
  const visitIds = new Set(visits.map((v) => v.id));
  const claims: DayClaim[] = [];
  for (const raw of rawClaims) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as {
      id?: string;
      updatedAt?: string;
      visitId?: string;
      status?: string;
    };
    const { id, updatedAt, visitId, status } = c;
    if (!id || !updatedAt || typeof updatedAt.slice !== "function") continue;
    if (updatedAt.slice(0, 10) !== dateYmd) continue;
    if (visitId && !visitIds.has(visitId)) continue;
    const normalizedStatus =
      status === "Draft" ||
      status === "Submitted" ||
      status === "In Review" ||
      status === "Approved" ||
      status === "Rejected"
        ? status
        : "Draft";
    claims.push({
      id,
      visitId,
      status: normalizedStatus,
      updatedAtIso: updatedAt,
    });
  }
  return {
    claims,
    counts: {
      total: claims.length,
      draft: claims.filter((x) => x.status === "Draft").length,
      submitted: claims.filter((x) => x.status === "Submitted").length,
      inReview: claims.filter((x) => x.status === "In Review").length,
      approved: claims.filter((x) => x.status === "Approved").length,
      rejected: claims.filter((x) => x.status === "Rejected").length,
    },
  };
}


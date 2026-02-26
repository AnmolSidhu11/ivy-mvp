import type { ExpenseClaim, Visit } from "../types";
import type { CalendarEvent } from "../types/calendar";
import { CALENDAR_EVENTS_STORAGE_KEY } from "../repos/LocalCalendarRepo";

/** localStorage keys used by seed — resetSeed() clears these. */
export const SEED_KEYS = {
  CLAIMS: "expense-demo:claims",
  VISITS: "expense-demo:visits",
  CALENDAR: CALENDAR_EVENTS_STORAGE_KEY,
  SEEDED: "expense-demo:seeded",
} as const;

function defaultPolicy() {
  return { warnings: [] as string[], blocks: [] as string[], requiresReview: false };
}

function audit(actor: string, action: string, detail?: string) {
  return { ts: new Date().toISOString(), actor, action, detail };
}

/** Deterministic: 6 visits for seed. */
function generateSeedVisits(): Visit[] {
  return [
    { id: "VIS-001", hcpName: "Dr. Smith" },
    { id: "VIS-002", hcpName: "Dr. Jones" },
    { id: "VIS-003", hcpName: "Dr. Chen" },
    { id: "VIS-004", hcpName: "Dr. Patel" },
    { id: "VIS-005", hcpName: "Dr. Walsh" },
    { id: "VIS-006", hcpName: "Dr. Rivera" },
  ];
}

/** Deterministic: 8 claims, mixed statuses. Each claim.visitId matches a visit in `visits`. */
function generateSeedClaims(visits: Visit[]): ExpenseClaim[] {
  const base = "2025-01-15T10:00:00.000Z";
  const statuses: ExpenseClaim["status"][] = [
    "Draft",
    "Draft",
    "Submitted",
    "Submitted",
    "In Review",
    "In Review",
    "Approved",
    "Rejected",
  ];
  const categories = ["Meal", "Other", "Taxi/Rideshare", "Parking", "Meal", "Hotel", "Meal", "Other"];
  const merchants = ["The Keg", "Vendor", "Uber", "Green P", "Bistro", "Marriott", "Cafe", "Supplies Co"];
  const claims: ExpenseClaim[] = [];

  for (let i = 0; i < 8; i++) {
    const visit = visits[i % visits.length];
    const status = statuses[i];
    const created = new Date(Date.parse(base) + i * 3600000).toISOString();
    const updated = new Date(Date.parse(created) + 7200000).toISOString();
    const attendees = [{ name: visit.hcpName, role: "HCP" }];
    const receipt = { fileName: `receipt-${i + 1}.pdf`, mimeType: "application/pdf", size: 1024 + i * 256 };
    const policy = defaultPolicy();

    const auditTrail = [audit("system", "created", "Draft")];
    if (status !== "Draft") auditTrail.push(audit("rep", "submitted"));
    if (status === "In Review" || status === "Approved" || status === "Rejected") {
      auditTrail.push(audit("manager", "sent_to_review"));
    }
    if (status === "Approved") auditTrail.push(audit("manager", "approved"));
    if (status === "Rejected") {
      auditTrail.push(audit("manager", "rejected", "Amount over policy limit"));
    }

    claims.push({
      id: `EXP-${String(i + 1).padStart(3, "0")}`,
      visitId: visit.id,
      repName: "Rep User",
      category: categories[i],
      merchant: merchants[i],
      amount: 40 + i * 8,
      currency: "CAD",
      attendees,
      receipt,
      notes: i % 2 === 0 ? "Business meeting." : "",
      flags: { noAlcohol: true, businessPurpose: true, policyConfirmed: true },
      status,
      createdAt: created,
      updatedAt: updated,
      policy,
      auditTrail,
    });
  }

  return claims;
}

/** Deterministic: 12 calendar events linked to first 3 visits (Pre-call, Visit, Post-call, Expense per visit). */
function generateSeedCalendarEvents(visits: Visit[]): CalendarEvent[] {
  const baseDay = "2025-01-20";
  const events: CalendarEvent[] = [];
  const usedVisits = visits.slice(0, 3);
  const slots = [
    { pre: "08:30:00", preEnd: "09:00:00", visit: "09:00:00", visitEnd: "09:30:00", post: "10:00:00", postEnd: "10:15:00", expense: "17:00:00", expenseEnd: "17:15:00" },
    { pre: "10:30:00", preEnd: "11:00:00", visit: "11:00:00", visitEnd: "11:30:00", post: "11:30:00", postEnd: "11:45:00", expense: "17:30:00", expenseEnd: "17:45:00" },
    { pre: "12:30:00", preEnd: "13:00:00", visit: "13:00:00", visitEnd: "13:30:00", post: "14:00:00", postEnd: "14:15:00", expense: "18:00:00", expenseEnd: "18:15:00" },
  ];

  usedVisits.forEach((visit, i) => {
    const s = slots[i];
    const ts = (t: string) => `${baseDay}T${t}.000Z`;

    [
      {
        id: `evt-seed-${visit.id}-pre`,
        title: `Pre-call: ${visit.hcpName}`,
        type: "Pre-call" as const,
        status: "Planned" as const,
        startAt: ts(s.pre),
        endAt: ts(s.preEnd),
        hcpName: visit.hcpName,
        visitId: visit.id,
        notes: "Review materials before visit.",
        createdAt: ts(s.pre),
        updatedAt: ts(s.pre),
      },
      {
        id: `evt-seed-${visit.id}-visit`,
        title: `Visit: ${visit.hcpName}`,
        type: "Visit" as const,
        status: "Planned" as const,
        startAt: ts(s.visit),
        endAt: ts(s.visitEnd),
        hcpName: visit.hcpName,
        location: "Clinic",
        visitId: visit.id,
        createdAt: ts(s.visit),
        updatedAt: ts(s.visit),
      },
      {
        id: `evt-seed-${visit.id}-post`,
        title: `Post-call: ${visit.hcpName}`,
        type: "Post-call" as const,
        status: "Planned" as const,
        startAt: ts(s.post),
        endAt: ts(s.postEnd),
        hcpName: visit.hcpName,
        visitId: visit.id,
        notes: "Document and next steps.",
        createdAt: ts(s.post),
        updatedAt: ts(s.post),
      },
      {
        id: `evt-seed-${visit.id}-expense`,
        title: "Expense reminder",
        type: "Expense" as const,
        status: "Planned" as const,
        startAt: ts(s.expense),
        endAt: ts(s.expenseEnd),
        hcpName: visit.hcpName,
        visitId: visit.id,
        notes: `Submit expense for ${visit.hcpName} visit.`,
        createdAt: ts(s.expense),
        updatedAt: ts(s.expense),
      },
    ].forEach((e) => events.push(e));
  });

  return events;
}

/** Run once on load: seeds localStorage if not already seeded. */
export function seed(): ExpenseClaim[] {
  if (localStorage.getItem(SEED_KEYS.SEEDED) === "true") {
    return getStoredClaims();
  }
  const visits = generateSeedVisits();
  const claims = generateSeedClaims(visits);
  const calendarEvents = generateSeedCalendarEvents(visits);
  localStorage.setItem(SEED_KEYS.VISITS, JSON.stringify(visits));
  localStorage.setItem(SEED_KEYS.CLAIMS, JSON.stringify(claims));
  localStorage.setItem(SEED_KEYS.CALENDAR, JSON.stringify(calendarEvents));
  localStorage.setItem(SEED_KEYS.SEEDED, "true");
  return claims;
}

/** Clears all localStorage keys used by seed. Call then seed() again to get fresh data. */
export function resetSeed(): void {
  localStorage.removeItem(SEED_KEYS.CLAIMS);
  localStorage.removeItem(SEED_KEYS.VISITS);
  localStorage.removeItem(SEED_KEYS.CALENDAR);
  localStorage.removeItem(SEED_KEYS.SEEDED);
}

export function getStoredClaims(): ExpenseClaim[] {
  try {
    const raw = localStorage.getItem(SEED_KEYS.CLAIMS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setStoredClaims(claims: ExpenseClaim[]): void {
  localStorage.setItem(SEED_KEYS.CLAIMS, JSON.stringify(claims));
}

export function getStoredVisits(): Visit[] {
  try {
    const raw = localStorage.getItem(SEED_KEYS.VISITS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

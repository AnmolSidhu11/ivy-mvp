/**
 * Demo seed: when DEMO_MODE, write deterministic dataset into app store (localStorage).
 * Uses existing keys: concierge_visits, concierge_notes, expense-demo:claims.
 * Sets concierge_demo_seeded = "true" to prevent reseeding.
 */

import type { VisitSummary } from "./mockVisits";
import type { Note } from "./notesRepo";
import { VISITS_STORAGE_KEY } from "./visitsRepo";
import {
  hcps,
  visitsPast,
  visitsFuture,
  notes as demoNotes,
  expenses,
  type DemoVisit,
} from "./demoDataset";

const NOTES_KEY = "concierge_notes";
const CLAIMS_KEY = "expense-demo:claims";
const SEEDED_KEY = "concierge_demo_seeded";

const REQUIRED_FIELD_LABELS = [
  "HCP and date captured",
  "Products discussed listed",
  "Key points documented",
  "Next actions recorded",
  "No patient identifiers",
];

function isDemoMode(): boolean {
  if (typeof process === "undefined") return true;
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

function toDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function demoVisitToVisitSummary(v: DemoVisit): VisitSummary {
  const hcp = hcps.find((h) => h.id === v.hcpId);
  const hcpName = hcp?.name ?? v.hcpId;
  const status = v.status === "Completed" ? "completed" : "draft";
  return {
    id: v.id,
    hcpName,
    date: v.date,
    channel: "In-person",
    summary: `Visit with ${hcpName} re: ${v.products.join(", ")}.`,
    products: v.products,
    keyPoints: ["Key points documented."],
    objections: [] as string[],
    nextActions: ["Follow up as agreed."],
    status,
    requiredFieldsPresent: [true, true, true, true, true],
    requiredFieldLabels: REQUIRED_FIELD_LABELS,
    hallucinationRisk: false,
    confidence: {
      summary: "high",
      keyPoints: "high",
      objections: "med",
      nextActions: "high",
    },
  };
}

function buildNotesForStore(): Note[] {
  const iso = "2026-01-01T12:00:00.000Z";
  return demoNotes.map((n) => ({
    id: n.id,
    dateYmd: n.date,
    title: n.title,
    body: n.body,
    visitId: n.visitId,
    hcpName: hcps.find((h) => h.id === n.hcpId)?.name,
    createdAtIso: iso,
    updatedAtIso: iso,
  }));
}

/** Raw claim rows for expense-demo:claims (id, visitId?, status, updatedAt). */
function buildClaimsForStore(): { id: string; visitId?: string; status: string; updatedAt: string }[] {
  return expenses.map((e) => ({
    id: e.id,
    visitId: e.visitId,
    status: e.status,
    updatedAt: `${e.date}T12:00:00.000Z`,
  }));
}

/**
 * If demo mode and not already seeded, write dataset to localStorage and set concierge_demo_seeded.
 * Call from client only (useEffect). Ensures one visit for "today" so dashboard agenda is never empty.
 * @returns true if data was written, false if skipped (already seeded or not demo mode)
 */
export function ensureDemoSeed(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDemoMode()) return false;
  if (window.localStorage.getItem(SEEDED_KEY) === "true") return false;

  const allVisits: VisitSummary[] = [
    ...visitsPast.map(demoVisitToVisitSummary),
    ...visitsFuture.map(demoVisitToVisitSummary),
  ];

  const todayYmd = toDateYmd(new Date());
  const hasVisitToday = allVisits.some((v) => v.date === todayYmd);
  if (!hasVisitToday) {
    const firstHcp = hcps[0]!;
    allVisits.push(
      demoVisitToVisitSummary({
        id: "VIS-demo-today",
        date: todayYmd,
        time: "10:00",
        status: "Completed",
        hcpId: firstHcp.id,
        products: ["Dupixent"],
        location: firstHcp.clinic,
        notesStatus: "Captured",
      })
    );
  }

  try {
    window.localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(allVisits));
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(buildNotesForStore()));
    window.localStorage.setItem(CLAIMS_KEY, JSON.stringify(buildClaimsForStore()));
    window.localStorage.setItem(SEEDED_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear demo data and reseed flag; reload the page. Call only when DEMO_MODE.
 */
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(VISITS_STORAGE_KEY);
    window.localStorage.removeItem(NOTES_KEY);
    window.localStorage.removeItem(CLAIMS_KEY);
    window.localStorage.removeItem(SEEDED_KEY);
  } catch {
    // ignore
  }
  window.location.reload();
}

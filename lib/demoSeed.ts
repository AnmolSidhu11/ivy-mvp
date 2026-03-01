/**
 * Demo seed: when DEMO_MODE and visits/claims/notes are empty, seed deterministic sample data
 * so dashboard and calendar never show empty placeholders.
 */

import type { VisitSummary } from "./mockVisits";
import { getWeekDates } from "./conciergeAgenda";
import { upsertVisit } from "./visitsRepo";

const VISITS_KEY = "concierge_visits";
const NOTES_KEY = "concierge_notes";
const CLAIMS_KEY = "expense-demo:claims";

function toDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build 5 visits spread across this week (Mon–Fri). */
function buildDemoVisits(): VisitSummary[] {
  const today = toDateYmd(new Date());
  const week = getWeekDates(today);
  const weekDays = week.slice(0, 5); // Mon–Fri
  const hcpNames = ["Dr. Patel", "Dr. Chen", "Dr. Alvarez", "Dr. Kim", "Dr. Walsh"];
  const channels = ["In-person", "Virtual", "Phone", "In-person", "Virtual"];
  const products = ["Dupixent", "ALTUVIIIO", "Beyfortus", "Toujeo", "Aubagio"];
  const summaries = [
    "Discussed Dupixent coverage workflow with clinic staff.",
    "Reviewed ALTUVIIIO initiation logistics.",
    "Quick follow-up on Beyfortus workflow.",
    "Toujeo and Lantus comparison; HCP interested in switching.",
    "Aubagio safety and monitoring; reinforced baseline labs.",
  ];
  return weekDays.map((date, i) => ({
    id: `demo-v-${i + 1}`,
    hcpName: hcpNames[i] ?? "Dr. Smith",
    date,
    channel: channels[i] ?? "In-person",
    summary: summaries[i] ?? "Visit completed.",
    products: [products[i] ?? "Product"],
    keyPoints: ["Key point documented."],
    objections: [] as string[],
    nextActions: ["Follow up as agreed."],
    status: "completed" as const,
    requiredFieldsPresent: [true, true, true, true, true],
    requiredFieldLabels: [
      "HCP and date captured",
      "Products discussed listed",
      "Key points documented",
      "Next actions recorded",
      "No patient identifiers",
    ],
    hallucinationRisk: false,
    confidence: {
      summary: "high" as const,
      keyPoints: "high" as const,
      objections: "med" as const,
      nextActions: "high" as const,
    },
  }));
}

/** Build 3 claims: 1 draft, 1 approved, 1 rejected (stored as raw for expense-demo:claims). */
function buildDemoClaims(visitIds: string[], weekDates: string[]): unknown[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-claim-draft",
      visitId: visitIds[0],
      status: "Draft",
      updatedAt: weekDates[0] ? `${weekDates[0]}T10:00:00.000Z` : now,
    },
    {
      id: "demo-claim-approved",
      visitId: visitIds[1],
      status: "Approved",
      updatedAt: weekDates[1] ? `${weekDates[1]}T14:00:00.000Z` : now,
    },
    {
      id: "demo-claim-rejected",
      visitId: visitIds[2],
      status: "Rejected",
      updatedAt: weekDates[2] ? `${weekDates[2]}T16:00:00.000Z` : now,
    },
  ];
}

/** Build 4 notes across this week. */
function buildDemoNotes(visitIds: string[], weekDates: string[]): unknown[] {
  const now = new Date().toISOString();
  const titles = ["Pre-call prep", "Visit notes", "Follow-up reminder", "Sample note"];
  const bodies = [
    "Review coverage checklist before call.",
    "HCP agreed to trial; send one-pager.",
    "Schedule touchpoint in 2 weeks.",
    "General note for demo.",
  ];
  const dates = [weekDates[0], weekDates[1], weekDates[2], weekDates[3]].filter(Boolean);
  return dates.slice(0, 4).map((dateYmd, i) => ({
    id: `demo-note-${i + 1}`,
    dateYmd: dateYmd ?? weekDates[0],
    title: titles[i] ?? "Note",
    body: bodies[i] ?? "",
    visitId: visitIds[i],
    createdAtIso: now,
    updatedAtIso: now,
  }));
}

function loadVisits(): VisitSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VISITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as VisitSummary[]) : [];
  } catch {
    return [];
  }
}

function loadNotesRaw(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as unknown[]) : [];
  } catch {
    return [];
  }
}

function loadClaimsRaw(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as unknown[]) : [];
  } catch {
    return [];
  }
}

/**
 * If visits, claims, or notes are empty, seed 5 visits (this week), 3 claims, 4 notes.
 * Call from client only when NEXT_PUBLIC_DEMO_MODE is true.
 * Returns true if seeding was performed (caller may refresh state).
 */
export function seedDemoDataIfEmpty(): boolean {
  if (typeof window === "undefined") return false;
  const visits = loadVisits();
  const notes = loadNotesRaw();
  const claims = loadClaimsRaw();
  const isEmpty = visits.length === 0 || notes.length === 0 || claims.length === 0;
  if (!isEmpty) return false;

  const today = toDateYmd(new Date());
  const weekDates = getWeekDates(today);
  const demoVisits = buildDemoVisits();
  demoVisits.forEach((v) => upsertVisit(v));
  const visitIds = demoVisits.map((v) => v.id);
  const demoClaims = buildDemoClaims(visitIds, weekDates);
  const demoNotes = buildDemoNotes(visitIds, weekDates);
  try {
    window.localStorage.setItem(CLAIMS_KEY, JSON.stringify(demoClaims));
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(demoNotes));
  } catch {
    // ignore
  }
  return true;
}

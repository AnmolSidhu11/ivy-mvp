import type { VisitSummary } from "./mockVisits";
import { normalizeDateYmd } from "./conciergeAgenda";

/** Single source of truth for visits (New Visit, Calendar, Dashboard). */
export const VISITS_STORAGE_KEY = "concierge_visits";

/** Alias for API: Visit is the stored visit type. */
export type Visit = VisitSummary;

function loadAll(): Visit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VISITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as VisitSummary[];
  } catch {
    return [];
  }
}

function saveAll(visits: Visit[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // ignore
  }
}

/** List all visits (client-only; returns [] on server). */
export function listVisits(): Visit[] {
  return loadAll();
}

/** Insert or update a visit by id; persists to localStorage. */
export function upsertVisit(visit: Visit): void {
  const all = loadAll();
  const idx = all.findIndex((v) => v.id === visit.id);
  const next = idx >= 0 ? [...all] : [visit, ...all];
  if (idx >= 0) next[idx] = visit;
  else next[0] = visit;
  saveAll(next);
}

/** List visits whose date (YYYY-MM-DD) matches dateYmd (local date). */
export function listVisitsByDate(dateYmd: string): Visit[] {
  const normalized = normalizeDateYmd(dateYmd);
  if (!normalized) return [];
  return loadAll().filter((v) => normalizeDateYmd(v.date) === normalized);
}

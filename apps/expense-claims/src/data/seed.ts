import type { Visit, ExpenseClaim } from "../types";
import { generateVisits } from "./generators";
import { generateClaims } from "./generators";

const VISITS_KEY = "expense-claims:visits";
const CLAIMS_KEY = "expense-claims:claims";
const SEEDED_KEY = "expense-claims:seeded";

export function isSeeded(): boolean {
  return localStorage.getItem(SEEDED_KEY) === "true";
}

export function getStoredVisits(): Visit[] {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getStoredClaims(): ExpenseClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function seedIfNeeded(): { visits: Visit[]; claims: ExpenseClaim[] } {
  if (isSeeded()) {
    return { visits: getStoredVisits(), claims: getStoredClaims() };
  }
  const visits = generateVisits(6);
  const claims = generateClaims(visits, 8);
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  localStorage.setItem(SEEDED_KEY, "true");
  return { visits, claims };
}

export function setStoredVisits(visits: Visit[]): void {
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
}

export function setStoredClaims(claims: ExpenseClaim[]): void {
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
}

import type { ClaimsRepo, DraftPayload } from "./ClaimsRepo";
import type { ExpenseClaim } from "../types";
import { getStoredClaims, setStoredClaims, getStoredVisits } from "../data/seed";
import { evaluatePolicy } from "../policy/policyEngine";

function nextId(): string {
  return `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function audit(actor: string, action: string, detail?: string) {
  return { ts: new Date().toISOString(), actor, action, detail };
}

/** Claims repo backed by localStorage (same keys as seed). */
export const LocalStorageRepo: ClaimsRepo = {
  async listClaims() {
    return getStoredClaims();
  },

  async listVisits() {
    return getStoredVisits();
  },

  async getClaim(id: string) {
    return getStoredClaims().find((c) => c.id === id) ?? null;
  },

  async createDraft(draft: DraftPayload): Promise<ExpenseClaim> {
    const now = new Date().toISOString();
    const policy = evaluatePolicy(draft);
    const claim: ExpenseClaim = {
      ...draft,
      id: nextId(),
      createdAt: now,
      updatedAt: now,
      status: "Draft",
      policy,
      auditTrail: [audit("system", "created", "Draft")],
    };
    const claims = getStoredClaims();
    claims.unshift(claim);
    setStoredClaims(claims);
    return claim;
  },

  async updateClaim(id: string, updates: Partial<ExpenseClaim>) {
    const claims = getStoredClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated: ExpenseClaim = {
      ...claims[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    claims[idx] = updated;
    setStoredClaims(claims);
    return updated;
  },

  async submitClaim(id: string): Promise<ExpenseClaim | null> {
    const claims = getStoredClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "Draft") return null;
    const policy = evaluatePolicy(claims[idx]);
    if (policy.blocks.length > 0) return null;
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      ...claims[idx],
      status: "Submitted",
      updatedAt: now,
      policy: { ...policy, requiresReview: policy.requiresReview },
      auditTrail: [...claims[idx].auditTrail, audit("rep", "submitted")],
    };
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },

  async deleteDraft(id: string): Promise<boolean> {
    const claims = getStoredClaims();
    const c = claims.find((x) => x.id === id);
    if (!c || c.status !== "Draft") return false;
    setStoredClaims(claims.filter((x) => x.id !== id));
    return true;
  },

  async approveClaim(id: string): Promise<ExpenseClaim | null> {
    const claims = getStoredClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "In Review") return null;
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      ...claims[idx],
      status: "Approved",
      updatedAt: now,
      auditTrail: [...claims[idx].auditTrail, audit("manager", "approved")],
    };
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },

  async rejectClaim(id: string, reason: string): Promise<ExpenseClaim | null> {
    const claims = getStoredClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "In Review") return null;
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      ...claims[idx],
      status: "Rejected",
      updatedAt: now,
      auditTrail: [...claims[idx].auditTrail, audit("manager", "rejected", reason)],
    };
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },

  async resubmitRejected(id: string): Promise<ExpenseClaim | null> {
    const claims = getStoredClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "Rejected") return null;
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      ...claims[idx],
      status: "Draft",
      updatedAt: now,
      auditTrail: [...claims[idx].auditTrail, audit("rep", "resubmit", "Edit & resubmit")],
    };
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },
};

import type { ExpenseClaim } from "../types";
import type { ClaimsRepo } from "./ClaimsRepo";
import { evaluatePolicy } from "../policy/policyEngine";
import { getStoredVisits, getStoredClaims, setStoredClaims } from "../data/seed"

function loadClaims(): ExpenseClaim[] {
  return getStoredClaims();
}

function audit(actor: string, action: string, detail?: string) {
  return { ts: new Date().toISOString(), actor, action, detail };
}

function nextId(): string {
  return `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const LocalStorageRepo: ClaimsRepo = {
  async listVisits() {
    return getStoredVisits();
  },

  async listClaims() {
    return loadClaims();
  },

  async getClaim(id: string) {
    return loadClaims().find((c) => c.id === id) ?? null;
  },

  async createDraft(draft) {
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
    const claims = loadClaims();
    claims.unshift(claim);
    setStoredClaims(claims);
    return claim;
  },

  async updateDraft(id: string, updates: Partial<ExpenseClaim>) {
    const claims = loadClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "Draft") return null;
    const updated = { ...claims[idx], ...updates, updatedAt: new Date().toISOString() };
    updated.policy = evaluatePolicy(updated);
    claims[idx] = updated;
    setStoredClaims(claims);
    return updated;
  },

  async deleteDraft(id: string) {
    const claims = loadClaims();
    const c = claims.find((x) => x.id === id);
    if (!c || c.status !== "Draft") return false;
    setStoredClaims(claims.filter((x) => x.id !== id));
    return true;
  },

  async submitClaim(id: string) {
    const claims = loadClaims();
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
    if (policy.requiresReview) {
      claim.status = "In Review";
      claim.auditTrail.push(audit("system", "sent_to_review", "Auto-routed for review"));
    }
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },

  async sendToReview(id: string) {
    const claims = loadClaims();
    const idx = claims.findIndex((c) => c.id === id);
    if (idx === -1 || claims[idx].status !== "Submitted") return null;
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      ...claims[idx],
      status: "In Review",
      updatedAt: now,
      auditTrail: [...claims[idx].auditTrail, audit("manager", "sent_to_review")],
    };
    claims[idx] = claim;
    setStoredClaims(claims);
    return claim;
  },

  async approveClaim(id: string) {
    const claims = loadClaims();
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

  async rejectClaim(id: string, reason: string) {
    const claims = loadClaims();
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

  async resubmitRejected(id: string) {
    const claims = loadClaims();
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

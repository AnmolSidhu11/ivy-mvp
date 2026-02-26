import type { ExpenseClaim, Visit } from "../types";
import type { ClaimsRepo } from "./ClaimsRepo";
import type { ADLSConfig } from "../types";
import { evaluatePolicy } from "../policy/policyEngine";

const CLAIMS_INDEX_KEY = "expense-claims:adls:claims-index";

function audit(actor: string, action: string, detail?: string) {
  return { ts: new Date().toISOString(), actor, action, detail };
}

function nextId(): string {
  return `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function blobUrl(config: ADLSConfig, path: string): string {
  const [base, qs] = config.sasBaseUrl.split("?");
  const cleanBase = base.replace(/\/$/, "");
  const container = config.containerName.replace(/^\//, "").replace(/\/$/, "");
  const prefix = (config.prefix || "").replace(/^\//, "").replace(/\/$/, "");
  const fullPath = prefix ? `${prefix}/${path}` : path;
  const pathPart = `${cleanBase}/${container}/${fullPath}`;
  return qs ? `${pathPart}?${qs}` : pathPart;
}

async function putBlob(url: string, body: string | Blob, contentType: string): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-ms-blob-type": "BlockBlob" },
    body: body instanceof Blob ? body : body,
  });
  if (!res.ok) throw new Error(`ADLS PUT failed: ${res.status}`);
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function getLocalIndex(): ExpenseClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalIndex(claims: ExpenseClaim[]) {
  localStorage.setItem(CLAIMS_INDEX_KEY, JSON.stringify(claims));
}

export function createADLSRepo(config: ADLSConfig, visits: Visit[]): ClaimsRepo {
  return {
    async listVisits() {
      return visits;
    },

    async listClaims() {
      const index = getLocalIndex();
      if (index.length > 0) return index;
      return [];
    },

    async getClaim(id: string) {
      const index = getLocalIndex();
      const c = index.find((x) => x.id === id);
      if (c) return c;
      const path = `gold/claims_current/${id}.json`;
      const url = blobUrl(config, path);
      return getJson<ExpenseClaim>(url);
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
      const rawPath = `raw/claims/${claim.id}/claim.json`;
      const rawUrl = blobUrl(config, rawPath);
      await putBlob(rawUrl, JSON.stringify(claim, null, 2), "application/json");
      const goldPath = `gold/claims_current/${claim.id}.json`;
      await putBlob(blobUrl(config, goldPath), JSON.stringify(claim, null, 2), "application/json");
      const index = getLocalIndex();
      index.unshift(claim);
      setLocalIndex(index);
      return claim;
    },

    async updateDraft(id: string, updates: Partial<ExpenseClaim>) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "Draft") return null;
      const updated = { ...index[idx], ...updates, updatedAt: new Date().toISOString() };
      updated.policy = evaluatePolicy(updated);
      await putBlob(blobUrl(config, `raw/claims/${id}/claim.json`), JSON.stringify(updated, null, 2), "application/json");
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(updated, null, 2), "application/json");
      index[idx] = updated;
      setLocalIndex(index);
      return updated;
    },

    async deleteDraft(id: string) {
      const index = getLocalIndex();
      const c = index.find((x) => x.id === id);
      if (!c || c.status !== "Draft") return false;
      setLocalIndex(index.filter((x) => x.id !== id));
      return true;
    },

    async submitClaim(id: string) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "Draft") return null;
      const policy = evaluatePolicy(index[idx]);
      if (policy.blocks.length > 0) return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...index[idx],
        status: "Submitted",
        updatedAt: now,
        policy: { ...policy, requiresReview: policy.requiresReview },
        auditTrail: [...index[idx].auditTrail, audit("rep", "submitted")],
      };
      if (policy.requiresReview) {
        claim.status = "In Review";
        claim.auditTrail.push(audit("system", "sent_to_review", "Auto-routed for review"));
      }
      await putBlob(blobUrl(config, `raw/claims/${id}/claim.json`), JSON.stringify(claim, null, 2), "application/json");
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(claim, null, 2), "application/json");
      index[idx] = claim;
      setLocalIndex(index);
      return claim;
    },

    async sendToReview(id: string) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "Submitted") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...index[idx],
        status: "In Review",
        updatedAt: now,
        auditTrail: [...index[idx].auditTrail, audit("manager", "sent_to_review")],
      };
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(claim, null, 2), "application/json");
      index[idx] = claim;
      setLocalIndex(index);
      return claim;
    },

    async approveClaim(id: string) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "In Review") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...index[idx],
        status: "Approved",
        updatedAt: now,
        auditTrail: [...index[idx].auditTrail, audit("manager", "approved")],
      };
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(claim, null, 2), "application/json");
      index[idx] = claim;
      setLocalIndex(index);
      return claim;
    },

    async rejectClaim(id: string, reason: string) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "In Review") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...index[idx],
        status: "Rejected",
        updatedAt: now,
        auditTrail: [...index[idx].auditTrail, audit("manager", "rejected", reason)],
      };
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(claim, null, 2), "application/json");
      index[idx] = claim;
      setLocalIndex(index);
      return claim;
    },

    async resubmitRejected(id: string) {
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === id);
      if (idx === -1 || index[idx].status !== "Rejected") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...index[idx],
        status: "Draft",
        updatedAt: now,
        auditTrail: [...index[idx].auditTrail, audit("rep", "resubmit", "Edit & resubmit")],
      };
      await putBlob(blobUrl(config, `gold/claims_current/${id}.json`), JSON.stringify(claim, null, 2), "application/json");
      index[idx] = claim;
      setLocalIndex(index);
      return claim;
    },

    async uploadReceipt(claimId: string, file: File): Promise<void> {
      const path = `raw/receipts/${claimId}/${file.name}`;
      const url = blobUrl(config, path);
      await putBlob(url, file, file.type || "application/octet-stream");
      const index = getLocalIndex();
      const idx = index.findIndex((c) => c.id === claimId);
      if (idx === -1) return;
      const claim = index[idx];
      const receipt = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        blobPath: path,
      };
      const updated: ExpenseClaim = { ...claim, receipt, updatedAt: new Date().toISOString() };
      await putBlob(blobUrl(config, `raw/claims/${claimId}/claim.json`), JSON.stringify(updated, null, 2), "application/json");
      await putBlob(blobUrl(config, `gold/claims_current/${claimId}.json`), JSON.stringify(updated, null, 2), "application/json");
      index[idx] = updated;
      setLocalIndex(index);
    },
  };
}

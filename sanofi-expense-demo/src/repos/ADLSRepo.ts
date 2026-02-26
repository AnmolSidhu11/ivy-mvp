import type { ExpenseClaim, Visit } from "../types";
import type { ClaimsRepo, DraftPayload } from "./ClaimsRepo";
import type { ADLSConfig } from "../types";
import { getStoredVisits } from "../data/seed";
import { evaluatePolicy } from "../policy/policyEngine";

const GOLD_INDEX_PATH = "gold/claims_current/index.json";

function buildBlobUrl(config: ADLSConfig, path: string): string {
  const [base, qs] = config.adlsSasBaseUrl.split("?");
  const cleanBase = base.replace(/\/$/, "");
  const container = config.containerName.replace(/^\//, "").replace(/\/$/, "");
  const prefix = (config.prefix ?? "").replace(/^\//, "").replace(/\/$/, "");
  const fullPath = prefix ? `${prefix}/${path}` : path;
  return qs ? `${cleanBase}/${container}/${fullPath}?${qs}` : `${cleanBase}/${container}/${fullPath}`;
}

async function putBlob(url: string, body: string | Blob, contentType: string): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-ms-blob-type": "BlockBlob" },
    body: body instanceof Blob ? body : body,
  });
  if (!res.ok) throw new Error(`ADLS PUT failed: ${res.status} ${url}`);
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ADLS GET failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

function nextId(): string {
  return `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function audit(actor: string, action: string, detail?: string) {
  return { ts: new Date().toISOString(), actor, action, detail };
}

/** Index file shape: list of claim ids. */
interface GoldIndex {
  claimIds: string[];
}

export function createADLSRepo(config: ADLSConfig): ClaimsRepo {
  const rawClaimPath = (id: string) => `raw/claims/${id}/claim.json`;
  const rawReceiptPath = (id: string, fileName: string) => `raw/receipts/${id}/${fileName}`;
  const goldClaimPath = (id: string) => `gold/claims_current/${id}.json`;

  async function getIndex(): Promise<GoldIndex> {
    const url = buildBlobUrl(config, GOLD_INDEX_PATH);
    const data = await getJson<GoldIndex>(url);
    return data ?? { claimIds: [] };
  }

  async function putIndex(index: GoldIndex): Promise<void> {
    const url = buildBlobUrl(config, GOLD_INDEX_PATH);
    await putBlob(url, JSON.stringify(index, null, 2), "application/json");
  }

  async function ensureIndexContains(claimId: string): Promise<void> {
    const index = await getIndex();
    if (index.claimIds.includes(claimId)) return;
    index.claimIds.push(claimId);
    await putIndex(index);
  }

  async function removeFromIndex(claimId: string): Promise<void> {
    const index = await getIndex();
    index.claimIds = index.claimIds.filter((id) => id !== claimId);
    await putIndex(index);
  }

  return {
    async listClaims(): Promise<ExpenseClaim[]> {
      const index = await getIndex();
      if (index.claimIds.length === 0) return [];
      const claims: ExpenseClaim[] = [];
      for (const id of index.claimIds) {
        const url = buildBlobUrl(config, goldClaimPath(id));
        const c = await getJson<ExpenseClaim>(url);
        if (c) claims.push(c);
      }
      return claims.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    async listVisits(): Promise<Visit[]> {
      return getStoredVisits();
    },

    async getClaim(id: string): Promise<ExpenseClaim | null> {
      const url = buildBlobUrl(config, goldClaimPath(id));
      return getJson<ExpenseClaim>(url);
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

      const rawUrl = buildBlobUrl(config, rawClaimPath(claim.id));
      await putBlob(rawUrl, JSON.stringify(claim, null, 2), "application/json");
      const goldUrl = buildBlobUrl(config, goldClaimPath(claim.id));
      await putBlob(goldUrl, JSON.stringify(claim, null, 2), "application/json");
      await ensureIndexContains(claim.id);

      if (claim.receipt) {
        const receiptUrl = buildBlobUrl(config, rawReceiptPath(claim.id, claim.receipt.fileName));
        await putBlob(
          receiptUrl,
          JSON.stringify({ claimId: claim.id, ...claim.receipt }, null, 2),
          "application/json"
        );
      }

      return claim;
    },

    async updateClaim(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | null> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current) return null;
      const updated: ExpenseClaim = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await putBlob(
        buildBlobUrl(config, rawClaimPath(id)),
        JSON.stringify(updated, null, 2),
        "application/json"
      );
      await putBlob(
        buildBlobUrl(config, goldClaimPath(id)),
        JSON.stringify(updated, null, 2),
        "application/json"
      );
      return updated;
    },

    async submitClaim(id: string): Promise<ExpenseClaim | null> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current || current.status !== "Draft") return null;
      const policy = evaluatePolicy(current);
      if (policy.blocks.length > 0) return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...current,
        status: "Submitted",
        updatedAt: now,
        policy: { ...policy, requiresReview: policy.requiresReview },
        auditTrail: [...current.auditTrail, audit("rep", "submitted")],
      };
      await putBlob(
        buildBlobUrl(config, rawClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      await putBlob(
        buildBlobUrl(config, goldClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      return claim;
    },

    async deleteDraft(id: string): Promise<boolean> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current || current.status !== "Draft") return false;
      await removeFromIndex(id);
      return true;
    },

    async approveClaim(id: string): Promise<ExpenseClaim | null> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current || current.status !== "In Review") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...current,
        status: "Approved",
        updatedAt: now,
        auditTrail: [...current.auditTrail, audit("manager", "approved")],
      };
      await putBlob(
        buildBlobUrl(config, rawClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      await putBlob(
        buildBlobUrl(config, goldClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      return claim;
    },

    async rejectClaim(id: string, reason: string): Promise<ExpenseClaim | null> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current || current.status !== "In Review") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...current,
        status: "Rejected",
        updatedAt: now,
        auditTrail: [...current.auditTrail, audit("manager", "rejected", reason)],
      };
      await putBlob(
        buildBlobUrl(config, rawClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      await putBlob(
        buildBlobUrl(config, goldClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      return claim;
    },

    async resubmitRejected(id: string): Promise<ExpenseClaim | null> {
      const current = await getJson<ExpenseClaim>(buildBlobUrl(config, goldClaimPath(id)));
      if (!current || current.status !== "Rejected") return null;
      const now = new Date().toISOString();
      const claim: ExpenseClaim = {
        ...current,
        status: "Draft",
        updatedAt: now,
        auditTrail: [...current.auditTrail, audit("rep", "resubmit", "Edit & resubmit")],
      };
      await putBlob(
        buildBlobUrl(config, rawClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      await putBlob(
        buildBlobUrl(config, goldClaimPath(id)),
        JSON.stringify(claim, null, 2),
        "application/json"
      );
      return claim;
    },
  };
}

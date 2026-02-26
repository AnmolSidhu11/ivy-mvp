import type { ExpenseClaim, Visit } from "../types";

/** Payload for creating a new draft (no id, timestamps, status, policy, auditTrail). */
export type DraftPayload = Omit<
  ExpenseClaim,
  "id" | "createdAt" | "updatedAt" | "status" | "policy" | "auditTrail"
>;

/** Repository for expense claims. Used by pipeline to read and persist updated claims. */
export interface ClaimsRepo {
  listClaims(): Promise<ExpenseClaim[]>;
  listVisits(): Promise<Visit[]>;
  getClaim(id: string): Promise<ExpenseClaim | null>;
  createDraft(draft: DraftPayload): Promise<ExpenseClaim>;
  updateClaim(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | null>;
  submitClaim(id: string): Promise<ExpenseClaim | null>;
  deleteDraft(id: string): Promise<boolean>;
  approveClaim(id: string): Promise<ExpenseClaim | null>;
  rejectClaim(id: string, reason: string): Promise<ExpenseClaim | null>;
  resubmitRejected(id: string): Promise<ExpenseClaim | null>;
}

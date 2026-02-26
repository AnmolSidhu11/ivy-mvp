import type { ExpenseClaim, Visit } from "../types";

export interface ClaimsRepo {
  listVisits(): Promise<Visit[]>;
  listClaims(): Promise<ExpenseClaim[]>;
  getClaim(id: string): Promise<ExpenseClaim | null>;
  createDraft(claim: Omit<ExpenseClaim, "id" | "createdAt" | "updatedAt" | "status" | "policy" | "auditTrail">): Promise<ExpenseClaim>;
  updateDraft(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | null>;
  deleteDraft(id: string): Promise<boolean>;
  submitClaim(id: string): Promise<ExpenseClaim | null>;
  sendToReview(id: string): Promise<ExpenseClaim | null>;
  approveClaim(id: string): Promise<ExpenseClaim | null>;
  rejectClaim(id: string, reason: string): Promise<ExpenseClaim | null>;
  resubmitRejected(id: string): Promise<ExpenseClaim | null>;
  uploadReceipt?(claimId: string, file: File): Promise<void>;
}

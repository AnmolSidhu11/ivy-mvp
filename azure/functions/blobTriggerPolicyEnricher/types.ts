/** Minimal types for the function (aligned with app policyEngine). */

export interface PolicyResult {
  warnings: string[];
  blocks: string[];
  requiresReview: boolean;
}

export interface Attendee {
  name: string;
  role: string;
}

export interface ExpenseClaim {
  id: string;
  visitId: string;
  repName: string;
  category: string;
  merchant: string;
  amount: number;
  currency: string;
  attendees: Attendee[];
  receipt: { fileName: string; mimeType: string; size: number } | null;
  notes: string;
  flags: { noAlcohol: boolean; businessPurpose: boolean; policyConfirmed: boolean };
  status: string;
  createdAt: string;
  updatedAt: string;
  policy: PolicyResult;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

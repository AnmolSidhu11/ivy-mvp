export type ClaimStatus =
  | "Draft"
  | "Submitted"
  | "In Review"
  | "Approved"
  | "Rejected";

export interface Visit {
  id: string;
  date: string;
  hcpName: string;
  location: string;
  productsDiscussed: string[];
}

export interface Attendee {
  name: string;
  role: string;
}

export interface ReceiptInfo {
  fileName: string;
  mimeType: string;
  size: number;
  blobPath?: string;
  mockUrl?: string;
}

export interface ClaimFlags {
  noAlcohol: boolean;
  businessPurpose: boolean;
  policyConfirmed: boolean;
}

export interface PolicyResult {
  warnings: string[];
  blocks: string[];
  requiresReview: boolean;
}

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
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
  receipt: ReceiptInfo | null;
  notes: string;
  flags: ClaimFlags;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  policy: PolicyResult;
  auditTrail: AuditEntry[];
}

export type StorageMode = "Local" | "ADLS";

export interface ADLSConfig {
  sasBaseUrl: string;
  containerName: string;
  prefix: string;
}

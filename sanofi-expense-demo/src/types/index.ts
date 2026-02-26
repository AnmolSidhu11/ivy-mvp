/** Claim lifecycle status. */
export type ClaimStatus =
  | "Draft"
  | "Submitted"
  | "In Review"
  | "Approved"
  | "Rejected";

export interface Visit {
  id: string;
  hcpName: string;
}

export interface Attendee {
  name: string;
  role: string;
}

export interface ReceiptInfo {
  fileName: string;
  mimeType: string;
  size: number;
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

/** Ingestion source for Snowflake-ready metadata. */
export type IngestionSource = "local" | "adls" | "snowflake";

export interface IngestionMeta {
  source: IngestionSource;
  lastSyncedAt?: string;
}

export interface SnowflakeMeta {
  claimRowId?: string;
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
  /** Present when synced from or to a backend; LocalStorageRepo does not set this. */
  ingestion?: IngestionMeta;
  /** Snowflake row mapping; LocalStorageRepo does not set this. */
  snowflake?: SnowflakeMeta;
}

export type StorageMode = "Local" | "ADLS";

export interface ADLSConfig {
  adlsSasBaseUrl: string;
  containerName: string;
  prefix: string;
}

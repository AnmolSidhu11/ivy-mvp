import type { ExpenseClaim, Visit } from "../types";

/** Simulated ADLS paths and JSON for Bronze (raw), Silver (enriched), Gold (current state). */

export const BRONZE_CLAIM_PATH = (claimId: string) =>
  `raw/claims/${claimId}/claim.json`;

export const BRONZE_RECEIPT_PATH = (claimId: string, fileName: string) =>
  `raw/receipts/${claimId}/${fileName}`;

export const SILVER_PATH = (claimId: string) =>
  `silver/claims/${claimId}/claim_enriched.json`;

export const GOLD_PATH = (claimId: string) =>
  `gold/claims_current/${claimId}.json`;

/** Bronze (raw): full claim as would be stored in raw/claims/{claimId}/claim.json */
export function getBronzeClaimJson(claim: ExpenseClaim): object {
  return { ...claim };
}

/** Bronze receipt: metadata only (blob at raw/receipts/{claimId}/{fileName} is binary) */
export function getBronzeReceiptJson(claim: ExpenseClaim): object | null {
  if (!claim.receipt) return null;
  return {
    claimId: claim.id,
    fileName: claim.receipt.fileName,
    mimeType: claim.receipt.mimeType,
    size: claim.receipt.size,
    blobPath: BRONZE_RECEIPT_PATH(claim.id, claim.receipt.fileName),
  };
}

/** Silver (enriched): claim + policy result + derived fields from visit */
export function getSilverEnrichedJson(claim: ExpenseClaim, visit: Visit | null): object {
  return {
    ...claim,
    _derived: {
      hcpName: visit?.hcpName ?? null,
      receiptBlobPath: claim.receipt
        ? BRONZE_RECEIPT_PATH(claim.id, claim.receipt.fileName)
        : null,
      policyEvaluatedAt: claim.updatedAt,
    },
  };
}

/** Gold (current): minimal fields for dashboard / listing */
export function getGoldCurrentJson(claim: ExpenseClaim, visit: Visit | null): object {
  return {
    id: claim.id,
    visitId: claim.visitId,
    hcpName: visit?.hcpName ?? null,
    status: claim.status,
    category: claim.category,
    merchant: claim.merchant,
    amount: claim.amount,
    currency: claim.currency,
    updatedAt: claim.updatedAt,
    createdAt: claim.createdAt,
  };
}

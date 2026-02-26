import type { ClaimsRepo } from "../repos/ClaimsRepo";
import type { PipelineRunner } from "../policy/pipelineRunner";
import type { AuditEntry } from "../types";

const SIMULATION_DELAY_MS = 500;

function audit(actor: string, action: string, detail?: string): AuditEntry {
  return { ts: new Date().toISOString(), actor, action, detail };
}

/**
 * Simulates Event Grid BlobCreated -> policy enricher:
 * - After a deterministic delay (500ms), appends audit events "BlobCreated" (detail: blob path)
 *   and "PolicyEnriched", then runs the pipeline via runner.run(claimId).
 * Caller should show toast "BlobCreated -> policyEnricher triggered" when invoking.
 */
export async function simulateBlobCreated(
  claimId: string,
  blobPath: string,
  repo: ClaimsRepo,
  runner: PipelineRunner
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATION_DELAY_MS));

  const claim = await repo.getClaim(claimId);
  if (!claim) return;

  const auditTrail: AuditEntry[] = [
    ...claim.auditTrail,
    audit("system", "BlobCreated", blobPath),
    audit("system", "PolicyEnriched"),
  ];
  await repo.updateClaim(claimId, { auditTrail });
  await runner.run(claimId);
}

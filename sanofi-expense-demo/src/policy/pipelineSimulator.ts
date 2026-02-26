import type { ClaimsRepo } from "../repos/ClaimsRepo";
import type { ExpenseClaim, AuditEntry } from "../types";
import { evaluatePolicy } from "./policyEngine";

function audit(actor: string, action: string, detail?: string): AuditEntry {
  return { ts: new Date().toISOString(), actor, action, detail };
}

/**
 * Runs the pipeline for a claim: evaluate policy, then:
 * - If blocks => keep Draft, append audit "PipelineBlocked".
 * - Else if requiresReview => set In Review, append audit "RoutedToReview".
 * - Else => set Approved, append audit "AutoApproved".
 * Persists via repo and returns the updated claim.
 */
export async function runPipeline(
  claimId: string,
  repo: ClaimsRepo
): Promise<ExpenseClaim | null> {
  const claim = await repo.getClaim(claimId);
  if (!claim) return null;

  const policy = evaluatePolicy(claim);
  const updatedAudit = [...claim.auditTrail];

  if (policy.blocks.length > 0) {
    // Keep Draft; append PipelineBlocked
    updatedAudit.push(audit("system", "PipelineBlocked", policy.blocks.join("; ")));
    return repo.updateClaim(claimId, {
      policy,
      auditTrail: updatedAudit,
    });
  }

  if (policy.requiresReview) {
    // In Review + RoutedToReview
    updatedAudit.push(audit("system", "RoutedToReview"));
    return repo.updateClaim(claimId, {
      status: "In Review",
      policy,
      auditTrail: updatedAudit,
    });
  }

  // Auto-approve
  updatedAudit.push(audit("system", "AutoApproved"));
  return repo.updateClaim(claimId, {
    status: "Approved",
    policy,
    auditTrail: updatedAudit,
  });
}

"use strict";
/**
 * Azure Function: Blob Trigger Policy Enricher.
 * Trigger: BlobCreated on raw/claims/{claimId}/claim.json (or raw/receipts/{claimId}/{fileName}
 * via a second trigger / function with same logic).
 *
 * 1) Read claim from trigger blob (claim.json).
 * 2) Evaluate policy (same rules as policyEngine).
 * 3) Write silver/claims/{claimId}/claim_enriched.json.
 * 4) Write gold/claims_current/{claimId}.json.
 * 5) Write audit/claims/{claimId}.json (JSON array of audit entries for this run).
 */
const policyEngine_1 = require("./policyEngine");
const AZURE_FUNCTIONS_CONTEXT = "AzureFunctions";
function auditEntry(actor, action, detail) {
    return { ts: new Date().toISOString(), actor, action, detail };
}
function parseClaim(triggerBlob) {
    try {
        const raw = typeof triggerBlob === "string" ? triggerBlob : triggerBlob.toString("utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Enriches claim with policy and derives status for gold.
 */
function enrichClaim(claim) {
    const policy = (0, policyEngine_1.evaluatePolicy)(claim);
    const auditTrail = [...claim.auditTrail];
    auditTrail.push(auditEntry(AZURE_FUNCTIONS_CONTEXT, "PolicyEnriched", policy.blocks.join("; ") || undefined));
    let status = claim.status;
    if (policy.blocks.length > 0) {
        auditTrail.push(auditEntry(AZURE_FUNCTIONS_CONTEXT, "PipelineBlocked", policy.blocks.join("; ")));
        status = "Draft";
    }
    else if (policy.requiresReview) {
        auditTrail.push(auditEntry(AZURE_FUNCTIONS_CONTEXT, "RoutedToReview"));
        status = "In Review";
    }
    else {
        auditTrail.push(auditEntry(AZURE_FUNCTIONS_CONTEXT, "AutoApproved"));
        status = "Approved";
    }
    const updatedAt = new Date().toISOString();
    return {
        ...claim,
        policy,
        auditTrail,
        status,
        updatedAt,
    };
}
async function blobTriggerPolicyEnricher(context, triggerBlob) {
    const claimId = context.bindingData?.claimId ?? "unknown";
    context.log("Blob trigger: claimId=%s", claimId);
    const claim = parseClaim(triggerBlob);
    if (!claim) {
        context.log("Invalid or missing claim JSON for claimId=%s", claimId);
        return;
    }
    const enriched = enrichClaim(claim);
    // Silver: enriched claim (claim + policy result + derived)
    const silverPayload = {
        ...enriched,
        _enrichedAt: new Date().toISOString(),
        _source: "blobTriggerPolicyEnricher",
    };
    context.bindings.silverBlob = JSON.stringify(silverPayload, null, 2);
    // Gold: current state for dashboard
    context.bindings.goldBlob = JSON.stringify(enriched, null, 2);
    // Audit: JSON array for this run (single file; for append use .jsonl + Append Blob in production)
    const auditEntries = enriched.auditTrail.slice(-3);
    context.bindings.auditBlob = JSON.stringify(auditEntries, null, 2);
    context.log("Policy enricher completed for claimId=%s, status=%s", claimId, enriched.status);
}
module.exports = blobTriggerPolicyEnricher;

/**
 * Policy evaluation (same rules as app policyEngine.ts).
 * BLOCK: no receipt, businessPurpose false, policyConfirmed false, no HCP attendee.
 * WARNING + requiresReview: Meal > CAD 60/person, category Other.
 */

import type { ExpenseClaim, PolicyResult, Attendee } from "./types";

const MEAL_LIMIT_CAD_PER_PERSON = 60;

export function evaluatePolicy(claim: Partial<ExpenseClaim>): PolicyResult {
  const result: PolicyResult = { warnings: [], blocks: [], requiresReview: false };

  if (!claim.receipt || !claim.receipt.fileName) {
    result.blocks.push("Receipt is required.");
  }
  if (!claim.flags?.businessPurpose) {
    result.blocks.push("Business purpose must be confirmed.");
  }
  if (!claim.flags?.policyConfirmed) {
    result.blocks.push("Policy compliance must be confirmed.");
  }

  const attendees = claim.attendees ?? [];
  const hasHCP = attendees.some(
    (a: Attendee) => (a.role || "").toLowerCase() === "hcp" && (a.name ?? "").trim() !== ""
  );
  if (!hasHCP) {
    result.blocks.push("At least one HCP attendee is required.");
  }

  const category = claim.category ?? "";
  if (category === "Other") {
    result.requiresReview = true;
    result.warnings.push("Category 'Other' requires manager review.");
  }

  const amount = claim.amount ?? 0;
  const currency = (claim.currency ?? "CAD").toUpperCase();
  const count = Math.max(1, attendees.length);
  if (category === "Meal" && currency === "CAD" && count > 0) {
    const perPerson = amount / count;
    if (perPerson > MEAL_LIMIT_CAD_PER_PERSON) {
      result.requiresReview = true;
      result.warnings.push(
        `Meal exceeds CAD ${MEAL_LIMIT_CAD_PER_PERSON} per person (${count} attendee(s)); requires review.`
      );
    }
  }

  return result;
}

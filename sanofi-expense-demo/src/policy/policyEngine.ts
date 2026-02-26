import type { ExpenseClaim, PolicyResult, Attendee } from "../types";
import { getMealLimitPerPersonCad } from "./policyConfig";

export type PolicyOptions = {
  mealLimitPerPersonCad?: number;
};

/**
 * Evaluates policy for a claim.
 * - BLOCK if no receipt.
 * - BLOCK if businessPurpose or policyConfirmed is false.
 * - BLOCK if no attendee with role "HCP" (case-insensitive).
 * - Meal: configurable CAD per person (default from policyConfig); if exceeded => warning + requiresReview.
 * - Other category => requiresReview warning.
 */
export function evaluatePolicy(claim: Partial<ExpenseClaim>, options?: PolicyOptions): PolicyResult {
  const result: PolicyResult = { warnings: [], blocks: [], requiresReview: false };
  const mealLimitCad = options?.mealLimitPerPersonCad ?? getMealLimitPerPersonCad();

  // BLOCK: receipt required
  if (!claim.receipt || !claim.receipt.fileName) {
    result.blocks.push("Receipt is required.");
  }

  // BLOCK: business purpose must be confirmed
  if (!claim.flags?.businessPurpose) {
    result.blocks.push("Business purpose must be confirmed.");
  }

  // BLOCK: policy must be confirmed
  if (!claim.flags?.policyConfirmed) {
    result.blocks.push("Policy compliance must be confirmed.");
  }

  // BLOCK: at least one attendee with role HCP (case-insensitive)
  const attendees = claim.attendees ?? [];
  const hasHCP = attendees.some(
    (a: Attendee) => (a.role || "").toLowerCase() === "hcp" && (a.name ?? "").trim() !== ""
  );
  if (!hasHCP) {
    result.blocks.push("At least one HCP attendee is required.");
  }

  // Other category => requiresReview warning
  const category = claim.category ?? "";
  if (category === "Other") {
    result.requiresReview = true;
    result.warnings.push("Category 'Other' requires manager review.");
  }

  // Meal: configurable CAD per person; if exceeded => warning + requiresReview
  const amount = claim.amount ?? 0;
  const currency = (claim.currency ?? "CAD").toUpperCase();
  const count = Math.max(1, attendees.length);
  if (category === "Meal" && currency === "CAD" && count > 0) {
    const perPerson = amount / count;
    if (perPerson > mealLimitCad) {
      result.requiresReview = true;
      result.warnings.push(
        `Meal exceeds CAD ${mealLimitCad} per person (${count} attendee(s)); requires review.`
      );
    }
  }

  return result;
}

import type { OrchestratorContext } from "../types";
import type { ExpenseDraftOutput } from "../types";

export interface ExpenseResult {
  output: ExpenseDraftOutput;
  warnings: string[];
  blocked?: boolean;
}

/** Deterministic placeholder expense justification. No external calls. */
export function run(context: OrchestratorContext): ExpenseResult {
  const visitId = context.visitId ?? "";
  const amount = context.amount;
  const category = context.category ?? "Meal";
  const hcpName = context.hcpName ?? "HCP";
  const warnings: string[] = [];
  const justification = [
    `Business meal with ${hcpName} in connection with visit ${visitId || "scheduled visit"}.`,
    "Discussion focused on approved product information and access.",
    amount != null ? `Amount: ${amount} (${category}).` : `Category: ${category}.`,
  ].join(" ");
  const output: ExpenseDraftOutput = {
    justification,
    category,
    amount,
    visitId: visitId || undefined,
  };
  return { output, warnings };
}

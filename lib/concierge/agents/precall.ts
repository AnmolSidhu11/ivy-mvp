import type { OrchestratorContext } from "../types";
import type { PrecallBriefOutput } from "../types";

export interface PrecallResult {
  output: PrecallBriefOutput;
  warnings: string[];
  blocked?: boolean;
}

/** Deterministic placeholder pre-call brief. No external calls. */
export function run(context: OrchestratorContext): PrecallResult {
  const visitId = context.visitId ?? "";
  const _hcpName = context.hcpName ?? "HCP";
  const location = context.location ?? "";
  const warnings: string[] = [];
  const output: PrecallBriefOutput = {
    objectives: [
      `Confirm objectives for visit ${visitId || "today"}.`,
      "Align on what success looks like for the interaction.",
    ],
    likelyQuestions: [
      "What has changed since our last discussion?",
      "Are there new access, workflow, or education gaps?",
    ],
    keyMessages: [
      "Stay within approved indications and materials.",
      "Focus on logistics, access, and support—not clinical advice.",
    ],
    complianceReminders: [
      "Do not discuss individual patient cases or PHI.",
      "Use only approved claims and resources.",
    ],
  };
  if (location) {
    output.objectives.push(`Location: ${location}.`);
  }
  return { output, warnings };
}

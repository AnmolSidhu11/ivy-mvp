import type { OrchestratorContext } from "../types";
import type { PostcallSummaryOutput } from "../types";

export interface PostcallResult {
  output: PostcallSummaryOutput;
  warnings: string[];
  blocked?: boolean;
}

/** Deterministic placeholder post-call summary. No external calls. */
export function run(context: OrchestratorContext): PostcallResult {
  const visitId = context.visitId ?? "";
  const transcriptText = context.transcriptText ?? context.notesText ?? "";
  const cleaned = transcriptText.trim().slice(0, 280);
  const warnings: string[] = [];
  const summary =
    cleaned.length === 0
      ? "Draft summary based on call notes. Add key details before saving."
      : `Draft summary (from notes): ${cleaned}${transcriptText.length > 280 ? "…" : ""}`;
  const output: PostcallSummaryOutput = {
    summary,
    objections: [
      "Capture any concerns about access, workflow, or education gaps.",
      "Note questions that require follow-up or routing to Medical Information.",
    ],
    nextSteps: [
      "Confirm any materials or follow-ups you committed to send.",
      "Schedule an appropriate next touchpoint if needed.",
    ],
    actionItems: [
      {
        text: `Log visit ${visitId || "today"} in CRM and file this summary as a draft.`,
        dueDateYmd: undefined,
      },
    ],
  };
  return { output, warnings };
}

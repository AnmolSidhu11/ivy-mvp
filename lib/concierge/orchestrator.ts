import type {
  AgentName,
  OrchestratorRequest,
  OrchestratorResponse,
  OrchestratorTask,
  OrchestratorContext,
  OrchestratorOutput,
  OrchestratorStatus,
} from "./types";
import { logAudit } from "./audit";
import { run as runScheduler } from "./agents/scheduler";
import { run as runPrecall } from "./agents/precall";
import { run as runPostcall } from "./agents/postcall";
import { run as runExpense } from "./agents/expense";
import { run as runCompliance } from "./agents/compliance";

function simpleHash(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function getAgentForTask(task: OrchestratorTask): AgentName {
  switch (task) {
    case "build_day_agenda":
      return "scheduler";
    case "precall_brief":
      return "precall";
    case "postcall_summary":
      return "postcall";
    case "expense_draft":
      return "expense";
    case "compliance_check":
      return "compliance";
    default:
      return "scheduler";
  }
}

function stringifyContext(ctx: OrchestratorContext): string {
  return JSON.stringify({
    dateYmd: ctx.dateYmd,
    visitId: ctx.visitId,
    claimId: ctx.claimId,
    repId: ctx.repId,
    hcpName: ctx.hcpName,
    location: ctx.location,
    amount: ctx.amount,
    category: ctx.category,
    notesLength: ctx.notesText?.length ?? 0,
    transcriptLength: ctx.transcriptText?.length ?? 0,
  });
}

/** Run compliance as verifier on input + output. Returns blocked if compliance blocks. */
function runComplianceVerifier(
  context: OrchestratorContext,
  output: OrchestratorOutput | null,
  userInput?: string
): { blocked: boolean; warnings: string[] } {
  const inputText = [
    userInput ?? "",
    context.notesText ?? "",
    context.transcriptText ?? "",
    context.hcpName ?? "",
    context.location ?? "",
  ].join(" ");
  const outputText =
    output == null
      ? ""
      : typeof output === "object" && "summary" in output
        ? (output as { summary?: string }).summary ?? ""
        : typeof output === "object" && "justification" in output
          ? (output as { justification?: string }).justification ?? ""
          : JSON.stringify(output);
  const result = runCompliance(context, inputText, outputText);
  return {
    blocked: result.blocked ?? result.output.blocked,
    warnings: result.output.warnings,
  };
}

export function runOrchestrator(req: OrchestratorRequest): OrchestratorResponse {
  const { task, context, userInput } = req;
  const agentName = getAgentForTask(task);
  const ts = new Date().toISOString();
  const inputHash = simpleHash(stringifyContext(context) + (userInput ?? ""));

  try {
    let output: OrchestratorOutput | null = null;
    let warnings: string[] = [];
    let blocked = false;

    switch (task) {
      case "build_day_agenda": {
        const r = runScheduler(context);
        output = r.output;
        warnings = r.warnings;
        blocked = r.blocked ?? false;
        break;
      }
      case "precall_brief": {
        const r = runPrecall(context);
        output = r.output;
        warnings = r.warnings;
        blocked = r.blocked ?? false;
        break;
      }
      case "postcall_summary": {
        const r = runPostcall(context);
        output = r.output;
        warnings = r.warnings;
        blocked = r.blocked ?? false;
        break;
      }
      case "expense_draft": {
        const r = runExpense(context);
        output = r.output;
        warnings = r.warnings;
        blocked = r.blocked ?? false;
        break;
      }
      case "compliance_check": {
        const r = runCompliance(context, context.notesText, context.transcriptText);
        output = r.output;
        warnings = r.warnings;
        blocked = r.blocked ?? r.output.blocked ?? false;
        break;
      }
    }

    const verifier = runComplianceVerifier(context, output, userInput);
    if (verifier.blocked) {
      blocked = true;
      warnings = [...warnings, ...verifier.warnings];
    }

    const outputHash = simpleHash(JSON.stringify(output));
    const auditId = logAudit({
      action: `orchestrator_${task}`,
      tsIso: ts,
      agent: agentName,
      task,
      entityType: task,
      entityId: context.visitId ?? context.claimId ?? context.dateYmd ?? "unknown",
      detail: blocked ? "blocked" : "draft",
    });

    let status: OrchestratorStatus = "draft";
    if (blocked) status = "blocked";

    return {
      task,
      status,
      output,
      warnings,
      auditId,
    };
  } catch (err) {
    const auditId = logAudit({
      action: `orchestrator_${task}_error`,
      tsIso: ts,
      agent: agentName,
      task,
      entityType: task,
      entityId: context.visitId ?? context.claimId ?? context.dateYmd ?? "unknown",
      detail: err instanceof Error ? err.message : String(err),
    });
    return {
      task,
      status: "error",
      output: null,
      warnings: [err instanceof Error ? err.message : String(err)],
      auditId,
    };
  }
}

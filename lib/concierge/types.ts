/** Agent identifiers for the Concierge multi-agent system. */
export type AgentName =
  | "scheduler"
  | "precall"
  | "postcall"
  | "expense"
  | "compliance";

/** Supported orchestrator tasks. */
export type OrchestratorTask =
  | "build_day_agenda"
  | "precall_brief"
  | "postcall_summary"
  | "expense_draft"
  | "compliance_check";

/** Context passed to the orchestrator (all optional; agents use what they need). */
export interface OrchestratorContext {
  dateYmd?: string;
  visitId?: string;
  claimId?: string;
  repId?: string;
  hcpName?: string;
  location?: string;
  notesText?: string;
  transcriptText?: string;
  amount?: number;
  category?: string;
}

export interface OrchestratorRequest {
  task: OrchestratorTask;
  context: OrchestratorContext;
  userInput?: string;
}

/** Task-specific output shapes (for type narrowing). */
export interface BuildDayAgendaOutput {
  dateYmd: string;
  items: Array<{
    time: string;
    type: string;
    label: string;
    visitId?: string;
    hcpName?: string;
    location?: string;
  }>;
}

export interface PrecallBriefOutput {
  objectives: string[];
  likelyQuestions: string[];
  keyMessages: string[];
  complianceReminders: string[];
}

export interface PostcallSummaryOutput {
  summary: string;
  objections: string[];
  nextSteps: string[];
  actionItems: Array<{ text: string; dueDateYmd?: string }>;
}

export interface ExpenseDraftOutput {
  justification: string;
  category: string;
  amount?: number;
  visitId?: string;
}

export interface ComplianceCheckOutput {
  warnings: string[];
  blocked: boolean;
}

export type OrchestratorOutput =
  | BuildDayAgendaOutput
  | PrecallBriefOutput
  | PostcallSummaryOutput
  | ExpenseDraftOutput
  | ComplianceCheckOutput;

export type OrchestratorStatus = "draft" | "blocked" | "error";

export interface OrchestratorResponse {
  task: OrchestratorTask;
  status: OrchestratorStatus;
  output: OrchestratorOutput | null;
  warnings: string[];
  auditId: string;
}

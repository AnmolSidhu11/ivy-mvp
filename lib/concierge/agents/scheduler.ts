import type { OrchestratorContext } from "../types";
import type { BuildDayAgendaOutput } from "../types";

export interface SchedulerResult {
  output: BuildDayAgendaOutput;
  warnings: string[];
  blocked?: boolean;
}

/** Deterministic placeholder day agenda. No external calls. */
export function run(context: OrchestratorContext): SchedulerResult {
  const dateYmd = context.dateYmd ?? "";
  const warnings: string[] = [];
  if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    warnings.push("Invalid or missing date; using placeholder agenda.");
  }
  const items = [
    { time: "09:30", type: "Pre-call", label: "Pre-call prep", visitId: undefined, hcpName: undefined, location: undefined },
    { time: "10:00", type: "Visit", label: "HCP visit", visitId: undefined, hcpName: undefined, location: undefined },
    { time: "10:30", type: "Post-call", label: "Post-call summary", visitId: undefined, hcpName: undefined, location: undefined },
    { time: "17:00", type: "Expense", label: "Expense reminder", visitId: undefined, hcpName: undefined, location: undefined },
  ];
  const output: BuildDayAgendaOutput = {
    dateYmd: dateYmd || "",
    items,
  };
  return { output, warnings };
}

/**
 * Shared ICS workflow: build events and filenames for Add to calendar (Visit Detail / Claim Detail).
 * All times are in local time (10:00 and 17:00) so ICS floating local DTSTART/DTEND display correctly.
 * Safe fallbacks for missing HCP/location.
 */
import { nextBusinessDayAt10Local, addMinutes, sameDayAt17Local } from "./calendarHelpers";
import type { IcsEventInput } from "./calendarIcs";

export type IcsWorkflowOption = "full" | "precall" | "visit" | "postcall" | "expense";

export type IcsWorkflowParams = {
  visitId: string;
  hcpName: string;
  claimId?: string;
  location?: string;
  /** When set, visit start is this date at 10:00 local; otherwise next business day 10:00 local. */
  visitDate?: Date;
};

function getVisitTimes(visitDate?: Date): { visitStart: Date; visitEnd: Date } {
  const visitStart = visitDate
    ? (() => {
        const d = new Date(visitDate);
        d.setHours(10, 0, 0, 0);
        return d;
      })()
    : nextBusinessDayAt10Local();
  const visitEnd = addMinutes(visitStart, 30);
  return { visitStart, visitEnd };
}

function buildDescription(params: IcsWorkflowParams, workflowPart: string): string {
  const hcp = params.hcpName?.trim() ? params.hcpName : "—";
  const visitId = params.visitId?.trim() ? params.visitId : "—";
  const claimLine = params.claimId ? `Claim ID: ${params.claimId}` : "";
  const lines = [
    `HCP: ${hcp}`,
    `Visit ID: ${visitId}`,
    claimLine,
    `Concierge workflow: ${workflowPart}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Returns events and filename for the chosen option.
 * entityIdForFilename: e.g. "VIS-001" or "EXP-001" for concierge_workflow_VIS-001.ics
 */
export function buildIcsWorkflow(
  params: IcsWorkflowParams,
  option: IcsWorkflowOption,
  entityIdForFilename: string
): { events: IcsEventInput[]; filename: string } {
  const hcp = params.hcpName?.trim() ? params.hcpName : "—";
  const { visitStart, visitEnd } = getVisitTimes(params.visitDate);
  const preCallStart = addMinutes(visitStart, -30);
  const preCallEnd = addMinutes(preCallStart, 15);
  const postCallStart = addMinutes(visitEnd, 30);
  const postCallEnd = addMinutes(postCallStart, 15);
  const expenseStart = sameDayAt17Local(visitStart);
  const expenseEnd = addMinutes(expenseStart, 10);

  const baseUid = (s: string) => `${entityIdForFilename}-${s}-${visitStart.getTime()}`;
  const loc = params.location?.trim() ? params.location : "—";

  const events: IcsEventInput[] = [];

  if (option === "full" || option === "precall") {
    events.push({
      start: preCallStart,
      end: preCallEnd,
      summary: `Pre-call: ${hcp}`,
      description: buildDescription(params, "pre-call"),
      location: loc,
      uid: baseUid("precall"),
    });
  }
  if (option === "full" || option === "visit") {
    events.push({
      start: visitStart,
      end: visitEnd,
      summary: `Visit: ${hcp}`,
      description: buildDescription(params, "visit"),
      location: loc,
      uid: baseUid("visit"),
    });
  }
  if (option === "full" || option === "postcall") {
    events.push({
      start: postCallStart,
      end: postCallEnd,
      summary: `Post-call: ${hcp}`,
      description: buildDescription(params, "post-call"),
      location: loc,
      uid: baseUid("postcall"),
    });
  }
  if (option === "full" || option === "expense") {
    events.push({
      start: expenseStart,
      end: expenseEnd,
      summary: "Expense reminder",
      description: buildDescription(params, "expense"),
      location: loc,
      uid: baseUid("expense"),
    });
  }

  const filenames: Record<IcsWorkflowOption, string> = {
    full: `concierge_workflow_${entityIdForFilename}.ics`,
    precall: `precall_${entityIdForFilename}.ics`,
    visit: `visit_${entityIdForFilename}.ics`,
    postcall: `postcall_${entityIdForFilename}.ics`,
    expense: `expense_reminder_${entityIdForFilename}.ics`,
  };

  return { events, filename: filenames[option] };
}

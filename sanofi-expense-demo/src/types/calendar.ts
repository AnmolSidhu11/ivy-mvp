export type EventType = "Pre-call" | "Visit" | "Post-call" | "Expense";
export type EventStatus = "Planned" | "Done" | "Skipped";

export type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startAt: string; // ISO
  endAt: string;   // ISO
  hcpName: string;
  location?: string;
  visitId?: string;
  claimId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

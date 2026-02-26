import type { CalendarEvent } from "../types/calendar";

export interface CalendarRepo {
  listEvents(rangeStartIso: string, rangeEndIso: string): Promise<CalendarEvent[]>;
  getEvent(id: string): Promise<CalendarEvent | null>;
  createEvent(event: Omit<CalendarEvent, "createdAt" | "updatedAt">): Promise<CalendarEvent>;
  updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent | null>;
  deleteEvent(id: string): Promise<boolean>;
  markDone(id: string): Promise<CalendarEvent | null>;
}

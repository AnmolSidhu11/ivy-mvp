import type { CalendarRepo } from "./CalendarRepo";
import type { CalendarEvent } from "../types/calendar";

export const CALENDAR_EVENTS_STORAGE_KEY = "expense_demo_calendar_events";
const STORAGE_KEY = CALENDAR_EVENTS_STORAGE_KEY;

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export const LocalCalendarRepo: CalendarRepo = {
  async listEvents(rangeStartIso: string, rangeEndIso: string): Promise<CalendarEvent[]> {
    const start = new Date(rangeStartIso).getTime();
    const end = new Date(rangeEndIso).getTime();
    return loadEvents().filter((e) => {
      const s = new Date(e.startAt).getTime();
      return s >= start && s <= end;
    });
  },

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return loadEvents().find((e) => e.id === id) ?? null;
  },

  async createEvent(
    event: Omit<CalendarEvent, "createdAt" | "updatedAt">
  ): Promise<CalendarEvent> {
    const now = new Date().toISOString();
    const full: CalendarEvent = {
      ...event,
      createdAt: now,
      updatedAt: now,
    };
    const events = loadEvents();
    events.push(full);
    saveEvents(events);
    return full;
  },

  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const events = loadEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated: CalendarEvent = {
      ...events[idx],
      ...patch,
      id: events[idx].id,
      updatedAt: new Date().toISOString(),
    };
    events[idx] = updated;
    saveEvents(events);
    return updated;
  },

  async deleteEvent(id: string): Promise<boolean> {
    const events = loadEvents();
    const i = events.findIndex((e) => e.id === id);
    if (i === -1) return false;
    events.splice(i, 1);
    saveEvents(events);
    return true;
  },

  async markDone(id: string): Promise<CalendarEvent | null> {
    return this.updateEvent(id, { status: "Done" });
  },
};

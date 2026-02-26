import { useEffect, useState, useMemo, useCallback } from "react";
import type { CalendarEvent, EventType, EventStatus } from "../types/calendar";
import { LocalCalendarRepo } from "../repos/LocalCalendarRepo";
import "./Calendar.css";

const EVENT_TYPES: (EventType | "All")[] = ["All", "Pre-call", "Visit", "Post-call", "Expense"];
const EVENT_STATUSES: (EventStatus | "All")[] = ["All", "Planned", "Done", "Skipped"];

function getWeekRange(weekStartIso: string): { rangeStartIso: string; rangeEndIso: string } {
  const start = new Date(weekStartIso);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(-1);
  return {
    rangeStartIso: start.toISOString(),
    rangeEndIso: end.toISOString(),
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function Calendar() {
  const [weekStartIso, setWeekStartIso] = useState("2025-01-20"); // Monday of seed week
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<EventType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesEdit, setNotesEdit] = useState("");
  const [saving, setSaving] = useState(false);

  const { rangeStartIso, rangeEndIso } = useMemo(
    () => getWeekRange(weekStartIso),
    [weekStartIso]
  );

  const loadEvents = useCallback(() => {
    LocalCalendarRepo.listEvents(rangeStartIso, rangeEndIso).then(setEvents);
  }, [rangeStartIso, rangeEndIso]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "All" && e.type !== typeFilter) return false;
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      return true;
    });
  }, [events, typeFilter, statusFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filtered.forEach((e) => {
      const key = getDateKey(e.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    map.forEach((arr) => arr.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    const keys = Array.from(map.keys()).sort();
    return keys.map((key) => ({ dateKey: key, dateLabel: formatDateLabel(key + "T12:00:00Z"), list: map.get(key)! }));
  }, [filtered]);

  const selectedEvent = selectedId ? events.find((e) => e.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectedEvent) setNotesEdit(selectedEvent.notes ?? "");
  }, [selectedEvent?.id, selectedEvent?.notes]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    const e = events.find((ev) => ev.id === id);
    setNotesEdit(e?.notes ?? "");
  };

  const closeDetail = () => {
    setSelectedId(null);
  };

  const handleSaveNotes = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await LocalCalendarRepo.updateEvent(selectedId, { notes: notesEdit.trim() || undefined });
      loadEvents();
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await LocalCalendarRepo.markDone(selectedId);
      loadEvents();
      closeDetail();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm("Delete this event?")) return;
    setSaving(true);
    try {
      await LocalCalendarRepo.deleteEvent(selectedId);
      loadEvents();
      closeDetail();
    } finally {
      setSaving(false);
    }
  };

  const prevWeek = () => {
    const d = new Date(weekStartIso);
    d.setUTCDate(d.getUTCDate() - 7);
    setWeekStartIso(d.toISOString().slice(0, 10));
  };

  const nextWeek = () => {
    const d = new Date(weekStartIso);
    d.setUTCDate(d.getUTCDate() + 7);
    setWeekStartIso(d.toISOString().slice(0, 10));
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1>Calendar</h1>
        <p className="calendar-subtitle">Week view — click an event for details</p>
      </div>

      <div className="calendar-card">
        <div className="calendar-controls">
          <div className="calendar-week-nav">
            <button type="button" onClick={prevWeek} className="calendar-nav-btn">
              ← Previous week
            </button>
            <span className="calendar-week-label">
              {formatDateLabel(weekStartIso + "T12:00:00Z")} –{" "}
              {formatDateLabel(
                new Date(new Date(weekStartIso + "T12:00:00Z").getTime() + 6 * 86400000).toISOString().slice(0, 10) + "T12:00:00Z"
              )}
            </span>
            <button type="button" onClick={nextWeek} className="calendar-nav-btn">
              Next week →
            </button>
          </div>
          <div className="calendar-filters">
            <label className="calendar-filter-label">
              Type
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as EventType | "All")}
                className="calendar-filter-select"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="calendar-filter-label">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EventStatus | "All")}
                className="calendar-filter-select"
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="calendar-card">
        {byDate.length === 0 ? (
          <div className="calendar-empty">No events in this week for the selected filters.</div>
        ) : (
          <div className="calendar-week-list">
            {byDate.map(({ dateKey, dateLabel, list }) => (
              <div key={dateKey} className="calendar-day-group">
                <h2 className="calendar-day-heading">{dateLabel}</h2>
                <div className="calendar-event-list">
                  {list.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => openDetail(e.id)}
                      className="calendar-event-row"
                    >
                      <span className="calendar-event-time">
                        {formatTime(e.startAt)} – {formatTime(e.endAt)}
                      </span>
                      <span className={`calendar-event-type-pill calendar-event-type-${e.type.toLowerCase().replace("-", "")}`}>
                        {e.type}
                      </span>
                      <span className="calendar-event-title">{e.title}</span>
                      <span className="calendar-event-hcp">{e.hcpName}</span>
                      <span className="calendar-event-location">{e.location ?? "—"}</span>
                      <span className={`calendar-event-status-pill calendar-event-status-${e.status.toLowerCase()}`}>
                        {e.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <>
          <div className="calendar-drawer-overlay" onClick={closeDetail} aria-hidden />
          <div className="calendar-drawer" role="dialog" aria-labelledby="calendar-drawer-title">
            <div className="calendar-drawer-header">
              <h2 id="calendar-drawer-title">Event details</h2>
              <button type="button" onClick={closeDetail} className="calendar-drawer-close" aria-label="Close">
                ×
              </button>
            </div>
            <div className="calendar-drawer-body">
              <p className="calendar-drawer-field">
                <strong>Title</strong> {selectedEvent.title}
              </p>
              <p className="calendar-drawer-field">
                <strong>Type</strong>{" "}
                <span className={`calendar-event-type-pill calendar-event-type-${selectedEvent.type.toLowerCase().replace("-", "")}`}>
                  {selectedEvent.type}
                </span>
              </p>
              <p className="calendar-drawer-field">
                <strong>Status</strong>{" "}
                <span className={`calendar-event-status-pill calendar-event-status-${selectedEvent.status.toLowerCase()}`}>
                  {selectedEvent.status}
                </span>
              </p>
              <p className="calendar-drawer-field">
                <strong>Time</strong> {formatTime(selectedEvent.startAt)} – {formatTime(selectedEvent.endAt)}
              </p>
              <p className="calendar-drawer-field">
                <strong>HCP</strong> {selectedEvent.hcpName}
              </p>
              {selectedEvent.location && (
                <p className="calendar-drawer-field">
                  <strong>Location</strong> {selectedEvent.location}
                </p>
              )}
              <div className="calendar-drawer-field">
                <label htmlFor="calendar-drawer-notes">
                  <strong>Notes</strong>
                </label>
                <textarea
                  id="calendar-drawer-notes"
                  value={notesEdit}
                  onChange={(e) => setNotesEdit(e.target.value)}
                  className="calendar-drawer-notes"
                  rows={4}
                />
                <button type="button" onClick={handleSaveNotes} disabled={saving} className="btn btn-secondary calendar-drawer-btn">
                  {saving ? "Saving…" : "Save notes"}
                </button>
              </div>
            </div>
            <div className="calendar-drawer-footer">
              {selectedEvent.status !== "Done" && (
                <button type="button" onClick={handleMarkDone} disabled={saving} className="btn btn-primary">
                  Mark done
                </button>
              )}
              <button type="button" onClick={handleDelete} disabled={saving} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

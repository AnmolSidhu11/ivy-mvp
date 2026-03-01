"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useVisitsStore, useNotesRepo } from "@/lib/store";
import { MOCK_VISITS, type VisitSummary } from "@/lib/mockVisits";
import type { Note } from "@/lib/notesRepo";
import {
  deriveAgendaItems,
  loadDayClaims,
  loadAllClaims,
  normalizeDateYmd,
  getWeekDates,
  getWeekStartMonday,
  getMonthGrid,
  localMinutesFromMidnight,
  durationMinutes,
  type DayClaimsSummary,
  type TimelineItem,
} from "@/lib/conciergeAgenda";
import { VISITS_STORAGE_KEY } from "@/lib/visitsRepo";
import { logAudit, listAuditByDate, type AuditEvent } from "@/lib/audit";
import type { AuditEvent as ConciergeAuditEntry } from "@/lib/concierge/audit";
import type {
  OrchestratorResponse,
  OrchestratorOutput,
  PrecallBriefOutput,
  PostcallSummaryOutput,
  ExpenseDraftOutput,
} from "@/lib/concierge/types";
import { QuickNoteModal } from "@/components/QuickNoteModal";
import { AddToCalendarDropdown } from "@/components/AddToCalendarDropdown";
<<<<<<< HEAD
import { ConciergePanel } from "@/components/ConciergePanel";
=======
>>>>>>> 168917255ea1837df883270dc4a694700018bf4b
import { DEMO_MODE } from "@/lib/env";

type ViewMode = "month" | "agenda" | "day" | "week";

type WeekDayData = {
  dateYmd: string;
  items: TimelineItem[];
};

type Props = {
  initialDate?: string;
};

/** Local date as YYYY-MM-DD (for calendar selected date and today). */
function toDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

const EMPTY_CLAIMS_SUMMARY: DayClaimsSummary = {
  claims: [],
  counts: {
    total: 0,
    draft: 0,
    submitted: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
  },
};

export function ConciergeCalendar({ initialDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same source as New Visit & Dashboard: VisitsProvider backed by visitsRepo (listVisits / upsertVisit).
  const { visits, addVisit } = useVisitsStore();
  const notesRepo = useNotesRepo();

  const searchDate = parseYmd(searchParams.get("date") ?? undefined);

  // selectedDateYmd: default today in local time, set in useEffect to avoid hydration mismatch
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => searchDate ?? initialDate ?? "");
  const [notes, setNotes] = useState<Note[]>([]);
  const [claimsSummary, setClaimsSummary] = useState<DayClaimsSummary>(EMPTY_CLAIMS_SUMMARY);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [conciergeAuditEntries, setConciergeAuditEntries] = useState<ConciergeAuditEntry[]>([]);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalContext, setNoteModalContext] = useState<{
    visitId?: string;
    hcpName?: string;
    note?: Note | null;
    dateYmdOverride?: string;
  }>({});
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [allNotesForMonth, setAllNotesForMonth] = useState<Note[]>([]);
  const [currentYearMonth, setCurrentYearMonth] = useState<string>("");
  const [todayYmd, setTodayYmd] = useState<string>("");
  const [weekData, setWeekData] = useState<WeekDayData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{ item: TimelineItem; dateYmd: string } | null>(null);
  const [orchestratorDraft, setOrchestratorDraft] = useState<{
    task: string;
    output: OrchestratorOutput;
    visitId?: string;
    claimId?: string;
    dateYmd: string;
    warnings: string[];
  } | null>(null);
  const [orchestratorLoading, setOrchestratorLoading] = useState<string | null>(null);

  // Set default to today on mount and track today for highlight (client-only; no Date in initial state).
  useEffect(() => {
    const today = toDateYmd(new Date());
    setTodayYmd(today);
    if (!selectedDateYmd) {
      setSelectedDateYmd(today);
      setCurrentYearMonth(today.slice(0, 7));
      logAudit("calendar_day_viewed", "calendar", today, "initial");
    } else {
      setCurrentYearMonth((prev) => prev || selectedDateYmd.slice(0, 7));
      logAudit("calendar_day_viewed", "calendar", selectedDateYmd, "initial");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (selectedDateYmd) setCurrentYearMonth(selectedDateYmd.slice(0, 7));
  }, [selectedDateYmd]);

  // Sync URL when selected date changes.
  useEffect(() => {
    if (!selectedDateYmd) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", selectedDateYmd);
    router.replace(`/calendar?${params.toString()}`);
  }, [selectedDateYmd, router, searchParams]);

  // On mount + when selectedDateYmd changes: load visits (store), claims (localStorage), notes (NotesRepo), derive agenda.
  useEffect(() => {
    if (!selectedDateYmd) return;
    let cancelled = false;
    (async () => {
      const [dayNotes] = await Promise.all([notesRepo.listByDate(selectedDateYmd)]);
      if (cancelled) return;
      const summary = loadDayClaims(selectedDateYmd, visits);
      const agenda = deriveAgendaItems(selectedDateYmd, visits, summary.claims, dayNotes);
      setNotes(dayNotes);
      setClaimsSummary(summary);
      setTimeline(agenda);
      setAuditEvents(listAuditByDate(selectedDateYmd));
      try {
        const auditRes = await fetch(`/api/audit?date=${selectedDateYmd}`);
        if (auditRes.ok) {
          const { entries } = (await auditRes.json()) as { entries: ConciergeAuditEntry[] };
          setConciergeAuditEntries(entries ?? []);
        } else {
          setConciergeAuditEntries([]);
        }
      } catch {
        setConciergeAuditEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDateYmd, visits, notesRepo]);

  // When view is week: load 7 days of notes + claims, derive items per day.
  useEffect(() => {
    if (viewMode !== "week" || !selectedDateYmd) return;
    const weekDates = getWeekDates(selectedDateYmd);
    let cancelled = false;
    (async () => {
      const notesByDay = await Promise.all(
        weekDates.map((dateYmd) => notesRepo.listByDate(dateYmd)),
      );
      if (cancelled) return;
      const dayData: WeekDayData[] = weekDates.map((dateYmd, i) => {
        const summary = loadDayClaims(dateYmd, visits);
        const items = deriveAgendaItems(
          dateYmd,
          visits,
          summary.claims,
          notesByDay[i] ?? [],
        );
        return { dateYmd, items };
      });
      setWeekData(dayData);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedDateYmd, visits, notesRepo]);

  useEffect(() => {
    if (viewMode !== "month" || !notesRepo.listAll) return;
    notesRepo.listAll().then(setAllNotesForMonth).catch(() => setAllNotesForMonth([]));
  }, [viewMode, notesRepo]);

  const monthGrid = useMemo(
    () => (currentYearMonth ? getMonthGrid(currentYearMonth) : []),
    [currentYearMonth]
  );
  const countsPerDay = useMemo(() => {
    const allClaims = typeof window !== "undefined" ? loadAllClaims() : [];
    const map = new Map<string, { visits: number; claims: number; notes: number }>();
    for (const dateYmd of monthGrid) {
      if (!dateYmd) continue;
      const nVisits = visits.filter((v) => normalizeDateYmd(v.date) === dateYmd).length;
      const nClaims = allClaims.filter((c) => c.dateYmd === dateYmd).length;
      const nNotes = allNotesForMonth.filter((n) => n.dateYmd === dateYmd).length;
      map.set(dateYmd, { visits: nVisits, claims: nClaims, notes: nNotes });
    }
    return map;
  }, [monthGrid, visits, allNotesForMonth]);

  const dayVisits = useMemo(
    () =>
      visits.filter(
        (v) => normalizeDateYmd(v.date) === normalizeDateYmd(selectedDateYmd),
      ),
    [visits, selectedDateYmd],
  );

  const handleShiftDay = useCallback(
    (delta: number) => {
      if (!selectedDateYmd) return;
      const d = new Date(selectedDateYmd + "T00:00:00");
      d.setDate(d.getDate() + delta);
      const next = toDateYmd(d);
      setSelectedDateYmd(next);
      logAudit("calendar_day_viewed", "calendar", next, `shift_${delta}`);
    },
    [selectedDateYmd],
  );

  const handleSeedToday = useCallback(() => {
    const dateYmd = selectedDateYmd || toDateYmd(new Date());
    const template = MOCK_VISITS[0];
    const seedVisit: VisitSummary = {
      ...template,
      id: `seed-${dateYmd}-${Date.now()}`,
      date: dateYmd,
      hcpName: "Sample HCP (Dev)",
      summary: "Seeded visit for calendar demo.",
      status: "completed",
    };
    addVisit(seedVisit);
    logAudit("calendar_day_viewed", "calendar", dateYmd, "seed");
    toast.success("Seeded sample visit for selected day. Agenda updated.");
  }, [addVisit, selectedDateYmd]);

  const openQuickNote = (ctx?: {
    visitId?: string;
    hcpName?: string;
    note?: Note | null;
    dateYmdOverride?: string;
  }) => {
    setNoteModalContext(ctx ?? {});
    setNoteModalOpen(true);
  };

  const handleSaveNote = async (data: { title: string; body: string }) => {
    const dateYmd = noteModalContext.dateYmdOverride ?? selectedDateYmd;
    if (!dateYmd) return;
    const existing = noteModalContext.note;
    if (existing) {
      const updated = await notesRepo.update(existing.id, { title: data.title, body: data.body });
      if (updated) logAudit("note_updated", "note", updated.id, `date=${dateYmd}`);
    } else {
      const created = await notesRepo.create({
        dateYmd,
        title: data.title,
        body: data.body,
        visitId: noteModalContext.visitId,
        hcpName: noteModalContext.hcpName,
      });
      logAudit("note_created", "note", created.id, `date=${dateYmd}`);
    }
    setNoteModalOpen(false);
    setNoteModalContext({});
    const dayNotes = await notesRepo.listByDate(selectedDateYmd);
    const summary = loadDayClaims(selectedDateYmd, visits);
    const agenda = deriveAgendaItems(selectedDateYmd, visits, summary.claims, dayNotes);
    setNotes(dayNotes);
    setClaimsSummary(summary);
    setTimeline(agenda);
    setAuditEvents(listAuditByDate(selectedDateYmd));
    if (viewMode === "week") {
      const weekDates = getWeekDates(selectedDateYmd);
      const notesByDay = await Promise.all(
        weekDates.map((d) => notesRepo.listByDate(d)),
      );
      setWeekData(
        weekDates.map((dateYmd, i) => {
          const s = loadDayClaims(dateYmd, visits);
          return {
            dateYmd,
            items: deriveAgendaItems(dateYmd, visits, s.claims, notesByDay[i] ?? []),
          };
        }),
      );
    }
    toast.success(existing ? "Note updated" : "Note saved");
  };

  const handlePrimaryAction = async (
    item: TimelineItem,
    dateYmdOverride?: string
  ) => {
    if (!selectedDateYmd) return;
    if (item.type === "Note" || !item.primaryAction.href) {
      let note: Note | null = item.noteId ? notes.find((n) => n.id === item.noteId) ?? null : null;
      if (item.noteId && !note) {
        note = await notesRepo.get(item.noteId);
      }
      openQuickNote({
        visitId: item.visitId,
        hcpName: item.hcpName,
        note: note ?? undefined,
        dateYmdOverride,
      });
      return;
    }
    try {
      router.push(item.primaryAction.href);
    } catch {
      toast("Not implemented yet");
      router.push("/dashboard");
    }
  };

  const runOrchestratorTask = useCallback(
    async (
      task: "precall_brief" | "postcall_summary" | "expense_draft",
      context: { visitId?: string; claimId?: string; dateYmd: string; hcpName?: string; location?: string; transcriptText?: string; notesText?: string; amount?: number; category?: string }
    ) => {
      setOrchestratorLoading(task);
      try {
        const res = await fetch("/api/concierge/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, context }),
        });
        const data = (await res.json()) as OrchestratorResponse;
        if (!res.ok) throw new Error("Request failed");
        if (data.status === "blocked") {
          toast.error("Content blocked by compliance.");
          return;
        }
        if (data.status === "error" || !data.output) {
          toast.error(data.warnings[0] ?? "Something went wrong.");
          return;
        }
        setOrchestratorDraft({
          task,
          output: data.output,
          visitId: context.visitId,
          claimId: context.claimId,
          dateYmd: context.dateYmd,
          warnings: data.warnings,
        });
        toast.success("Draft ready. Review and save below.");
      } catch {
        toast.error("Unable to generate draft.");
      } finally {
        setOrchestratorLoading(null);
      }
    },
    []
  );

  const handleGeneratePrecall = useCallback(
    (item: TimelineItem, dateYmd: string) => {
      if (!item.visitId) return;
      runOrchestratorTask("precall_brief", {
        visitId: item.visitId,
        dateYmd,
        hcpName: item.hcpName,
        location: item.location,
      });
    },
    [runOrchestratorTask]
  );

  const handleGeneratePostcall = useCallback(
    (item: TimelineItem, dateYmd: string) => {
      if (!item.visitId) return;
      const transcriptText = notes
        .filter((n) => n.visitId === item.visitId)
        .map((n) => n.body)
        .join("\n\n")
        .trim();
      runOrchestratorTask("postcall_summary", {
        visitId: item.visitId,
        dateYmd,
        transcriptText,
      });
    },
    [runOrchestratorTask, notes]
  );

  const handleGenerateExpenseDraft = useCallback(
    (item: TimelineItem, dateYmd: string) => {
      runOrchestratorTask("expense_draft", {
        visitId: item.visitId,
        claimId: item.claimId,
        dateYmd,
        hcpName: item.hcpName,
        category: "Meal",
      });
    },
    [runOrchestratorTask]
  );

  const draftAsNoteBody = useCallback((draft: { output: OrchestratorOutput }) => {
    const o = draft.output;
    if ("objectives" in o) {
      const p = o as PrecallBriefOutput;
      return [
        "Objectives:\n" + p.objectives.join("\n"),
        "Likely questions:\n" + p.likelyQuestions.join("\n"),
        "Key messages:\n" + p.keyMessages.join("\n"),
        "Compliance:\n" + p.complianceReminders.join("\n"),
      ].join("\n\n");
    }
    if ("summary" in o) {
      const p = o as PostcallSummaryOutput;
      return [
        p.summary,
        "Objections:\n" + p.objections.join("\n"),
        "Next steps:\n" + p.nextSteps.join("\n"),
        "Actions:\n" + p.actionItems.map((a) => a.text).join("\n"),
      ].join("\n\n");
    }
    if ("justification" in o) {
      const e = o as ExpenseDraftOutput;
      return `${e.justification}\n\nCategory: ${e.category}${e.amount != null ? ` · Amount: ${e.amount}` : ""}`;
    }
    return JSON.stringify(o);
  }, []);

  const handleSaveDraftToNote = useCallback(async () => {
    if (!orchestratorDraft) return;
    const title =
      orchestratorDraft.task === "precall_brief"
        ? "Pre-call brief"
        : orchestratorDraft.task === "postcall_summary"
          ? "Post-call summary"
          : "Expense justification";
    const body = draftAsNoteBody(orchestratorDraft);
    await notesRepo.create({
      dateYmd: orchestratorDraft.dateYmd,
      title,
      body,
      visitId: orchestratorDraft.visitId,
      hcpName: undefined,
    });
    logAudit("note_created", "note", title, "orchestrator_draft");
    toast.success("Saved to notes.");
    setOrchestratorDraft(null);
    const savedDateYmd = orchestratorDraft.dateYmd;
    if (viewMode === "week") {
      const weekDates = getWeekDates(selectedDateYmd ?? "");
      const notesByDay = await Promise.all(
        weekDates.map((dateYmd) => notesRepo.listByDate(dateYmd))
      );
      const dayData: WeekDayData[] = weekDates.map((dateYmd, i) => {
        const summary = loadDayClaims(dateYmd, visits);
        const items = deriveAgendaItems(
          dateYmd,
          visits,
          summary.claims,
          notesByDay[i] ?? []
        );
        return { dateYmd, items };
      });
      setWeekData(dayData);
    }
    if (savedDateYmd === selectedDateYmd) {
      const dayNotes = await notesRepo.listByDate(savedDateYmd);
      const summary = loadDayClaims(savedDateYmd, visits);
      setNotes(dayNotes);
      setTimeline(deriveAgendaItems(savedDateYmd, visits, summary.claims, dayNotes));
    }
  }, [orchestratorDraft, notesRepo, draftAsNoteBody, viewMode, selectedDateYmd, visits]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-3 border-b border-white/40 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-violet">
              Concierge Calendar
            </h1>
            <p className="text-sm text-zinc-600">
              Pre-call → Visit → Post-call → Expense
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const today = toDateYmd(new Date());
                setSelectedDateYmd(today);
                logAudit("calendar_day_viewed", "calendar", today, "today");
              }}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleShiftDay(-1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleShiftDay(1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Tomorrow
            </button>
            <input
              type="date"
              value={selectedDateYmd || ""}
              onChange={(e) => {
                const next = parseYmd(e.target.value) ?? "";
                setSelectedDateYmd(next);
                if (next) {
                  logAudit("calendar_day_viewed", "calendar", next, "picker");
                }
              }}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
<<<<<<< HEAD
              {(["month", "agenda", "day", "week"] as const).map((mode) => {
                const disabled = DEMO_MODE && mode !== "month";
=======
              {(["agenda", "day", "week"] as const).map((mode) => {
                const disabled = DEMO_MODE && mode !== "agenda";
>>>>>>> 168917255ea1837df883270dc4a694700018bf4b
                return (
                  <button
                    key={mode}
                    type="button"
                    title={disabled ? "Coming soon" : undefined}
                    disabled={disabled}
                    onClick={() => !disabled && setViewMode(mode)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                      disabled ? "cursor-not-allowed text-zinc-400" : ""
                    } ${
                      viewMode === mode
                        ? "bg-violet text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    } ${disabled && viewMode !== mode ? "bg-zinc-50" : ""}`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => openQuickNote({ dateYmdOverride: selectedDateYmd })}
              className="rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-zinc-800"
            >
              + Quick note
            </button>
            <Link
              href={`/new-visit?date=${selectedDateYmd}`}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50"
            >
              + Add meeting
            </Link>
            {typeof process !== "undefined" &&
              process.env.NODE_ENV === "development" && (
              <button
                type="button"
                onClick={handleSeedToday}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Seed sample visit for today
              </button>
            )}
          </div>
        </header>

        {/* Month view: full month grid (30/31 days) + right-side Agenda panel when date clicked */}
        {viewMode === "month" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {currentYearMonth
                    ? (() => {
                        const [y, m] = currentYearMonth.split("-");
                        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        return `${monthNames[Number(m) - 1] ?? m} ${y}`;
                      })()
                    : "Month"}
                </h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentYearMonth) return;
                      const [y, m] = currentYearMonth.split("-").map(Number);
                      const d = new Date(y, m - 2, 1);
                      const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                      setCurrentYearMonth(prev);
                      setSelectedDateYmd(`${prev}-01`);
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentYearMonth) return;
                      const [y, m] = currentYearMonth.split("-").map(Number);
                      const d = new Date(y, m, 1);
                      const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                      setCurrentYearMonth(next);
                      setSelectedDateYmd(`${next}-01`);
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-px rounded-lg border border-zinc-100 bg-zinc-100">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="bg-zinc-50 py-1.5 text-center text-[10px] font-semibold text-zinc-600"
                  >
                    {d}
                  </div>
                ))}
                {monthGrid.map((dateYmd, idx) => {
                  const counts = dateYmd ? countsPerDay.get(dateYmd) : null;
                  const hasActivity = counts && (counts.visits > 0 || counts.claims > 0 || counts.notes > 0);
                  const isSelected = dateYmd === selectedDateYmd;
                  const isToday = dateYmd === todayYmd;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => dateYmd && setSelectedDateYmd(dateYmd)}
                      className={`min-h-[72px] rounded-none bg-white p-1.5 text-left text-xs transition-colors ${
                        !dateYmd ? "cursor-default bg-zinc-50/50" : "hover:bg-violet/10"
                      } ${isSelected ? "ring-2 ring-violet bg-violet/10" : ""} ${isToday ? "bg-amber-50/80 ring-1 ring-amber-200" : ""} ${hasActivity ? "font-medium text-zinc-900" : "text-zinc-500"}`}
                    >
                      {dateYmd ? (
                        <>
                          <span className="block font-mono">{dateYmd.slice(8)}</span>
                          {(counts?.visits ?? 0) + (counts?.claims ?? 0) + (counts?.notes ?? 0) > 0 && (
                            <span className="mt-1 flex flex-wrap gap-0.5">
                              {(counts?.visits ?? 0) > 0 && (
                                <span className="rounded bg-violet/20 px-1 text-[10px] text-violet-800">
                                  {counts!.visits}v
                                </span>
                              )}
                              {(counts?.claims ?? 0) > 0 && (
                                <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-800">
                                  {counts!.claims}c
                                </span>
                              )}
                              {(counts?.notes ?? 0) > 0 && (
                                <span className="rounded bg-zinc-200 px-1 text-[10px] text-zinc-700">
                                  {counts!.notes}n
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Right-side Agenda panel for selected date */}
            <aside className="flex flex-col gap-3">
              {selectedDateYmd ? (
                <>
                  <section className="space-y-2 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                      <h2 className="text-sm font-semibold text-zinc-900">
                        Agenda · {selectedDateYmd}
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openQuickNote({ dateYmdOverride: selectedDateYmd })}
                          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Add note
                        </button>
                        <Link
                          href={`/new-visit?date=${selectedDateYmd}`}
                          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Add meeting
                        </Link>
                        <Link
                          href={dayVisits[0] ? `/expense/submit?date=${selectedDateYmd}&visitId=${encodeURIComponent(dayVisits[0].id)}` : `/expense/submit?date=${selectedDateYmd}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                        >
                          Submit expense
                        </Link>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {dayVisits.length} visit{dayVisits.length === 1 ? "" : "s"} · {notes.length} note{notes.length === 1 ? "" : "s"} · {claimsSummary.counts.total} claim{claimsSummary.counts.total === 1 ? "" : "s"}
                    </p>
                    {timeline.length === 0 ? (
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-4 text-center">
                        <p className="text-xs font-medium text-zinc-700">No activity for this day</p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Add a note, add a meeting, or create a visit to see pre-call, visit, post-call, and expense items.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {timeline.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="mr-2 font-mono text-[11px] text-zinc-500">{item.timeLabel}</span>
                              <span
                                className={
                                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                  (item.type === "Visit" ? "bg-violet/10 text-violet" : item.type === "Expense" ? "bg-emerald-50 text-emerald-700" : item.type === "Note" ? "bg-zinc-100 text-zinc-700" : "bg-indigo-50 text-indigo-700")
                                }
                              >
                                {item.type}
                              </span>
                              {item.hcpName && <span className="ml-1 font-medium text-zinc-900">{item.hcpName}</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePrimaryAction(item)}
                              className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
                            >
                              {item.primaryAction.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
                    <h2 className="border-b border-zinc-100 pb-2 text-sm font-semibold text-zinc-900">Day summary</h2>
                    <p className="mt-2 text-xs text-zinc-600">
                      Claims: {claimsSummary.counts.draft} draft, {claimsSummary.counts.submitted} submitted, {claimsSummary.counts.approved} approved
                    </p>
                    {claimsSummary.claims.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {claimsSummary.claims.map((c) => (
                          <li key={c.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-600">{c.status}</span>
                            <Link href={`/claim/${encodeURIComponent(c.id)}`} className="font-medium text-violet hover:underline">Open</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : (
                <section className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
                  <p className="text-sm font-medium text-zinc-600">Click a date to see agenda</p>
                  <p className="mt-1 text-xs text-zinc-500">Pre-call · Visit · Post-call · Expense · Notes</p>
                </section>
              )}
              <ConciergePanel variant="side" />
            </aside>
          </div>
        )}

        {/* Week view: 7 columns Mon–Sun, time grid 07:00–19:00 */}
        {viewMode === "week" && (
          <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
            <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2">
              <h2 className="text-sm font-semibold text-zinc-900">Week</h2>
              <p className="text-xs text-zinc-500">
                {selectedDateYmd ? `${getWeekStartMonday(selectedDateYmd)} → ${weekData[6]?.dateYmd ?? ""}` : "Select a date"}
              </p>
            </div>
            {!selectedDateYmd ? (
              <p className="py-8 text-center text-sm text-zinc-500">Select a date to see the week.</p>
            ) : (
            <div
              className="grid overflow-x-auto"
              style={{
                gridTemplateColumns: "56px repeat(7, minmax(72px, 1fr))",
                minHeight: "520px",
              }}
            >
              {/* Time labels: empty cell for all-day row, then 07:00–19:00 */}
              <div className="flex flex-col border-r border-zinc-100 pr-1 text-right">
                <div className="h-8 shrink-0 text-[10px] font-mono text-zinc-400">All day</div>
                {Array.from({ length: 13 }, (_, i) => 7 + i).map((h) => (
                  <div
                    key={h}
                    className="flex h-10 shrink-0 items-center text-[10px] font-mono text-zinc-500"
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {getWeekDates(selectedDateYmd).map((dateYmd) => {
                const dayData = weekData.find((d) => d.dateYmd === dateYmd) ?? {
                  dateYmd,
                  items: [],
                };
                const d = new Date(dateYmd + "T00:00:00");
                const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(d.getDay() + 6) % 7] ?? "";
                const dateNum = dateYmd.slice(8);
                const GRID_START_MIN = 7 * 60;
                const GRID_END_MIN = 19 * 60;
                const RANGE_MIN = 720;
                const ROW_HEIGHT = 40;
                const totalHeight = 12 * ROW_HEIGHT;
                const noteItems = dayData.items.filter((i) => i.type === "Note");
                const timeGridItems = dayData.items.filter((i) => i.type !== "Note");
                return (
                  <div
                    key={dateYmd}
                    className="relative border-r border-zinc-100 last:border-r-0"
                  >
                    <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-1 py-1 text-center text-[10px] font-medium text-zinc-700">
                      {dayLabel} {dateNum}
                    </div>
                    {/* All-day row: note chips */}
                    <div className="flex min-h-8 flex-wrap items-start gap-1 border-b border-zinc-100 bg-zinc-50/50 px-1 py-1">
                      {noteItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEvent({ item, dateYmd })}
                          className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-800 shadow-sm hover:bg-zinc-200"
                        >
                          {item.hcpName ? `${item.hcpName} note` : "Note"}
                        </button>
                      ))}
                    </div>
                    <div
                      className="relative w-full"
                      style={{ height: totalHeight }}
                    >
                      {timeGridItems.map((item) => {
                        const startMin = localMinutesFromMidnight(item.startIso);
                        const dur = durationMinutes(item.startIso, item.endIso);
                        const topMin = Math.max(GRID_START_MIN, startMin);
                        const endMin = Math.min(GRID_END_MIN, startMin + dur);
                        const heightMin = endMin - topMin;
                        if (heightMin <= 0) return null;
                        const topPct = ((topMin - GRID_START_MIN) / RANGE_MIN) * 100;
                        const heightPct = (heightMin / RANGE_MIN) * 100;
                        const typeClass =
                          item.type === "Visit"
                            ? "bg-violet/20 border-violet/40 text-violet-900"
                            : item.type === "Expense"
                              ? "bg-emerald-100 border-emerald-200 text-emerald-900"
                              : "bg-indigo-100 border-indigo-200 text-indigo-900";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedEvent({ item, dateYmd })}
                            className={`absolute left-0.5 right-0.5 rounded border text-left text-[10px] font-medium shadow-sm hover:opacity-90 ${typeClass}`}
                            style={{
                              top: `${topPct}%`,
                              height: `${Math.max(heightPct, 4)}%`,
                              minHeight: "20px",
                            }}
                          >
                            <span className="truncate block">{item.timeLabel}</span>
                            <span className="truncate block font-semibold">{item.type}</span>
                            {item.hcpName && (
                              <span className="truncate block text-[9px] opacity-90">{item.hcpName}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        )}

        {/* Day view: single column time grid */}
        {viewMode === "day" && (
          <section className="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
            <div className="mb-2 border-b border-zinc-100 pb-2">
              <h2 className="text-sm font-semibold text-zinc-900">Day · {selectedDateYmd || "Select a date"}</h2>
            </div>
            {!selectedDateYmd ? (
              <p className="py-8 text-center text-sm text-zinc-500">Select a date to see the day.</p>
            ) : (
            <div className="grid grid-cols-[56px_1fr] gap-0">
              <div className="flex flex-col">
                {Array.from({ length: 13 }, (_, i) => 7 + i).map((h) => (
                  <div key={h} className="h-10 shrink-0 text-[10px] font-mono text-zinc-500">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              <div className="relative" style={{ height: 12 * 40 }}>
                {timeline
                  .filter(
                    (it) =>
                      it.type === "Pre-call" ||
                      it.type === "Visit" ||
                      it.type === "Post-call" ||
                      it.type === "Expense" ||
                      it.type === "Note",
                  )
                  .map((item) => {
                    const isNote = item.type === "Note";
                    const startMin = isNote ? 8 * 60 : localMinutesFromMidnight(item.startIso);
                    const dur = isNote ? 5 : durationMinutes(item.startIso, item.endIso);
                    const GRID_START_MIN = 7 * 60;
                    const RANGE_MIN = 720;
                    const topMin = Math.max(GRID_START_MIN, startMin);
                    const endMin = Math.min(19 * 60, startMin + dur);
                    const heightMin = endMin - topMin;
                    if (heightMin <= 0) return null;
                    const topPct = ((topMin - GRID_START_MIN) / RANGE_MIN) * 100;
                    const heightPct = (heightMin / RANGE_MIN) * 100;
                    const typeClass =
                      item.type === "Visit"
                        ? "bg-violet/20 border-violet/40"
                        : item.type === "Expense"
                          ? "bg-emerald-100 border-emerald-200"
                          : item.type === "Note"
                            ? "bg-zinc-100 border-zinc-200"
                            : "bg-indigo-100 border-indigo-200";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEvent({ item, dateYmd: selectedDateYmd })}
                        className={`absolute left-1 right-1 rounded border text-left text-[10px] ${typeClass}`}
                        style={{
                          top: `${topPct}%`,
                          height: `${Math.max(heightPct, 4)}%`,
                          minHeight: "24px",
                        }}
                      >
                        {item.timeLabel} · {item.type}
                        {item.hcpName && ` · ${item.hcpName}`}
                      </button>
                    );
                  })}
              </div>
            </div>
            )}
          </section>
        )}

        {/* Agenda + Day summary column (Agenda view and Day view only; Month view uses inline right panel) */}
        <div
          className={`grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] ${
            viewMode === "month" ? "hidden" : ""
          }`}
        >
          {/* Agenda column */}
          <section className="space-y-3 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  {viewMode === "month" ? "Agenda for selected day" : "Day agenda"}
                </h2>
                <p className="text-xs text-zinc-500">
                  {selectedDateYmd || "Select a date"} ·{" "}
                  {dayVisits.length} visit{dayVisits.length === 1 ? "" : "s"} ·{" "}
                  {notes.length} note{notes.length === 1 ? "" : "s"}
                </p>
                {typeof process !== "undefined" &&
                  process.env.NODE_ENV === "development" && (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    Loaded visits: {visits.length} · Storage: {VISITS_STORAGE_KEY}
                  </p>
                )}
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-6 text-center">
                <p className="text-sm font-medium text-zinc-700">No activity for this day</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add a quick note above or create a visit to see pre-call, visit, post-call, and expense items.
                </p>
                <Link
                  href="/new-visit"
                  className="mt-3 inline-flex rounded-full bg-violet px-4 py-2 text-xs font-medium text-white hover:bg-violet/90"
                >
                  Create a new visit
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {timeline.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
                  >
                    <div className="flex flex-1 gap-3">
                      <div className="mt-0.5 w-14 shrink-0 text-[11px] font-mono text-zinc-500">
                        {item.timeLabel}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                              (item.type === "Visit"
                                ? "bg-violet/10 text-violet"
                                : item.type === "Expense"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.type === "Note"
                                    ? "bg-zinc-100 text-zinc-700"
                                    : "bg-indigo-50 text-indigo-700")
                            }
                          >
                            {item.type}
                          </span>
                          {item.hcpName && (
                            <span className="text-xs font-medium text-zinc-900">
                              {item.hcpName}
                            </span>
                          )}
                          {item.status && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                              {item.status}
                            </span>
                          )}
                        </div>
                        {item.location && (
                          <p className="text-[11px] text-zinc-500">{item.location}</p>
                        )}
                        {item.visitId && (
                          <p className="text-[11px] text-zinc-500">
                            Visit {item.visitId}
                          </p>
                        )}
                        {item.type === "Note" && item.noteId && (
                          <p className="text-[11px] text-zinc-500">
                            Note ID {item.noteId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => handlePrimaryAction(item)}
                        className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
                      >
                        {item.primaryAction.label}
                      </button>
                      {(item.type === "Pre-call" ||
                        item.type === "Visit" ||
                        item.type === "Post-call" ||
                        (item.type === "Expense" && item.visitId)) &&
                        item.visitId && (
                          <AddToCalendarDropdown
                            visitId={item.visitId}
                            hcpName={item.hcpName ?? ""}
                            dateYmd={selectedDateYmd}
                            onDownload={() =>
                              logAudit("ics_generated", "visit", item.visitId!, "calendar")
                            }
                          />
                        )}
                      {item.type === "Pre-call" && (
                        <button
                          type="button"
                          onClick={() => handleGeneratePrecall(item, selectedDateYmd ?? "")}
                          className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-50"
                        >
                          Generate pre-call brief
                        </button>
                      )}
                      {item.type === "Post-call" && (
                        <button
                          type="button"
                          onClick={() => handleGeneratePostcall(item, selectedDateYmd ?? "")}
                          className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-50"
                        >
                          Generate post-call summary
                        </button>
                      )}
                      {item.type !== "Note" && (
                        <button
                          type="button"
                          onClick={() =>
                            openQuickNote({ visitId: item.visitId, hcpName: item.hcpName })
                          }
                          className="rounded-full border border-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50"
                        >
                          Add quick note
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Day summary */}
          <aside className="space-y-3 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Day summary</h2>
                <p className="text-xs text-zinc-500">
                  Visits {dayVisits.length} · Notes {notes.length} · Claims{" "}
                  {claimsSummary.counts.total}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditOpen(true)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Audit
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">Claims status</p>
              <p>
                Draft: {claimsSummary.counts.draft} · Submitted:{" "}
                {claimsSummary.counts.submitted} · In review:{" "}
                {claimsSummary.counts.inReview}
              </p>
              <p>
                Approved: {claimsSummary.counts.approved} · Rejected:{" "}
                {claimsSummary.counts.rejected}
              </p>
            </div>

            {claimsSummary.claims.length > 0 && (
              <div className="mt-2 space-y-1 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Claims for this day
                </p>
                <ul className="space-y-1">
                  {claimsSummary.claims.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1"
                    >
                      <span className="font-mono text-[11px] text-zinc-800">{c.id}</span>
                      <span className="text-[11px] text-zinc-600">{c.status}</span>
                      <Link
                        href={`/claim/${encodeURIComponent(c.id)}`}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-violet hover:bg-violet/10"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {notes.length > 0 && (
              <div className="mt-4 space-y-1 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Notes
                </p>
                <ul className="space-y-1">
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-md bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700"
                    >
                      <span className="font-medium">{n.title}</span>
                      {n.hcpName && <span className="text-zinc-500"> · {n.hcpName}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Event detail drawer (week/day view) */}
      {(selectedEvent || orchestratorDraft) && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => {
              if (orchestratorDraft) setOrchestratorDraft(null);
              else setSelectedEvent(null);
            }}
            aria-hidden
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto border-l border-zinc-200 bg-white shadow-xl">
            {orchestratorDraft ? (
              <>
                <div className="sticky top-0 border-b border-zinc-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      DRAFT · {orchestratorDraft.task.replace(/_/g, " ")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOrchestratorDraft(null)}
                      className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  {orchestratorDraft.warnings.length > 0 && (
                    <p className="text-[11px] text-amber-700">{orchestratorDraft.warnings.join(" ")}</p>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <pre className="max-h-64 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-[11px] text-zinc-800 whitespace-pre-wrap">
                    {draftAsNoteBody(orchestratorDraft)}
                  </pre>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(draftAsNoteBody(orchestratorDraft));
                        toast.success("Copied to clipboard");
                      }}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraftToNote}
                      className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Save to note
                    </button>
                  </div>
                </div>
              </>
            ) : selectedEvent ? (
              <>
                <div className="sticky top-0 border-b border-zinc-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">{selectedEvent.item.type}</h2>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(null)}
                      className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {selectedEvent.item.timeLabel}
                    {selectedEvent.item.hcpName && ` · ${selectedEvent.item.hcpName}`}
                  </p>
                  {selectedEvent.item.location && (
                    <p className="text-[11px] text-zinc-500">{selectedEvent.item.location}</p>
                  )}
                  {selectedEvent.item.visitId && (
                    <p className="text-[11px] text-zinc-400">Visit {selectedEvent.item.visitId}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => {
                      handlePrimaryAction(selectedEvent.item, selectedEvent.dateYmd);
                      setSelectedEvent(null);
                    }}
                    className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    {selectedEvent.item.primaryAction.label}
                  </button>
                  {(selectedEvent.item.type === "Pre-call" ||
                    selectedEvent.item.type === "Visit" ||
                    selectedEvent.item.type === "Post-call" ||
                    (selectedEvent.item.type === "Expense" && selectedEvent.item.visitId)) &&
                    selectedEvent.item.visitId && (
                      <div className="flex justify-center">
                        <AddToCalendarDropdown
                          visitId={selectedEvent.item.visitId}
                          hcpName={selectedEvent.item.hcpName ?? ""}
                          dateYmd={selectedEvent.dateYmd}
                          onDownload={() =>
                            logAudit("ics_generated", "visit", selectedEvent.item.visitId!, "calendar")
                          }
                        />
                      </div>
                    )}
                  {selectedEvent.item.type === "Pre-call" && (
                    <button
                      type="button"
                      onClick={() => handleGeneratePrecall(selectedEvent.item, selectedEvent.dateYmd)}
                      disabled={orchestratorLoading === "precall_brief"}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {orchestratorLoading === "precall_brief" ? "Generating…" : "Pre-call brief"}
                    </button>
                  )}
                  {(selectedEvent.item.type === "Visit" || selectedEvent.item.type === "Post-call") && (
                    <button
                      type="button"
                      onClick={() => handleGeneratePostcall(selectedEvent.item, selectedEvent.dateYmd)}
                      disabled={orchestratorLoading === "postcall_summary"}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {orchestratorLoading === "postcall_summary" ? "Generating…" : "Draft post-call summary"}
                    </button>
                  )}
                  {(selectedEvent.item.type === "Expense" || selectedEvent.item.type === "Visit") && (
                    <button
                      type="button"
                      onClick={() => handleGenerateExpenseDraft(selectedEvent.item, selectedEvent.dateYmd)}
                      disabled={orchestratorLoading === "expense_draft"}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {orchestratorLoading === "expense_draft" ? "Generating…" : "Draft expense justification"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNoteModalContext({
                        visitId: selectedEvent.item.visitId,
                        hcpName: selectedEvent.item.hcpName,
                        dateYmdOverride: selectedEvent.dateYmd,
                      });
                      setNoteModalOpen(true);
                      setSelectedEvent(null);
                    }}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Add quick note
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {noteModalOpen && (
        <QuickNoteModal
          open={noteModalOpen}
          dateYmd={noteModalContext.dateYmdOverride ?? selectedDateYmd}
          visitId={noteModalContext.visitId}
          hcpName={noteModalContext.hcpName}
          initialNote={noteModalContext.note ?? null}
          onCancel={() => {
            setNoteModalOpen(false);
            setNoteModalContext({});
          }}
          onSave={handleSaveNote}
        />
      )}

      {auditOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setAuditOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl ring-1 ring-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Audit events</h2>
                <p className="text-xs text-zinc-500">{selectedDateYmd}</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditOpen(false)}
                className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <div className="max-h-full overflow-y-auto px-4 py-3 text-xs text-zinc-800">
              {conciergeAuditEntries.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 font-semibold text-zinc-700">Agent runs (Concierge)</p>
                  <ul className="space-y-2">
                    {conciergeAuditEntries.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-md bg-violet/5 px-2 py-1.5 text-[11px] ring-1 ring-violet/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{e.action}</span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {e.tsIso.slice(11, 19)}
                          </span>
                        </div>
                        <div className="text-zinc-700">
                          {e.agent ?? "—"} · {e.entityType ?? ""} {e.entityId ?? ""}
                        </div>
                        {e.detail != null && (
                          <div className="text-zinc-500">
                            <span className="font-medium">Detail:</span> {String(e.detail)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {auditEvents.length === 0 && conciergeAuditEntries.length === 0 ? (
                <p className="text-zinc-500">No audit events for this day yet.</p>
              ) : auditEvents.length > 0 ? (
                <div>
                  <p className="mb-1.5 font-semibold text-zinc-700">Events</p>
                  <ul className="space-y-2">
                    {auditEvents.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-md bg-zinc-50 px-2 py-1.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{e.action}</span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {e.tsIso.slice(11, 19)}
                          </span>
                        </div>
                        <div className="text-zinc-700">
                          {e.entityType} {e.entityId}
                        </div>
                        {e.detail && (
                          <div className="text-zinc-500">
                            <span className="font-medium">Detail:</span> {e.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CallDraft } from "./types";
import { getEventById } from "./mock";
import { MOCK_VISITS, type VisitSummary } from "./mockVisits";
import { INTERNAL_MODE, DEMO_MODE } from "./env";
import type { NotesRepo } from "./notesRepo";
import { LocalNotesRepo } from "./localNotesRepo";
import { listVisits, upsertVisit } from "./visitsRepo";
import { seedDemoDataIfEmpty } from "./demoSeed";

const STORAGE_KEY = "drafts";

type DraftsRecord = Record<string, CallDraft>;

interface DraftsContextValue {
  drafts: DraftsRecord;
  createDraftFromCapture: (eventId: string, transcript: string) => CallDraft;
  upsertDraft: (draft: CallDraft) => void;
  updateDraftFields: (
    id: string,
    partial: Partial<
      Pick<
        CallDraft,
        "channel" | "call_objective" | "products_discussed" | "notes_summary" | "safety"
      >
    >,
  ) => void;
}

const DraftsContext = createContext<DraftsContextValue | undefined>(undefined);

function loadInitialDrafts(): DraftsRecord {
  if (typeof window === "undefined" || INTERNAL_MODE) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftsRecord;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function persistDrafts(drafts: DraftsRecord) {
  if (typeof window === "undefined" || INTERNAL_MODE) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}

function nextDraftId(existing: DraftsRecord): string {
  const base = "draft_";
  let n = Object.keys(existing).length + 1;
  let id = `${base}${n}`;
  while (existing[id]) {
    n += 1;
    id = `${base}${n}`;
  }
  return id;
}

export function DraftsProvider({ children }: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<DraftsRecord>(() => loadInitialDrafts());

  useEffect(() => {
    persistDrafts(drafts);
  }, [drafts]);

  const value = useMemo<DraftsContextValue>(
    () => ({
      drafts,
      createDraftFromCapture(eventId: string, transcript: string) {
        const event = getEventById(eventId);
        const id = nextDraftId(drafts);
        const createdAt = new Date().toISOString();

        const draft: CallDraft = {
          id,
          eventId,
          hcpId: event?.hcpId ?? null,
          userId: "u_1001",
          transcript,
          channel: "",
          call_objective: "",
          products_discussed: [],
          notes_summary: transcript.trim().slice(0, 160),
          createdAt,
          safety: null,
        };

        setDrafts((prev) => ({ ...prev, [id]: draft }));
        return draft;
      },
      upsertDraft(draft: CallDraft) {
        setDrafts((prev) => ({ ...prev, [draft.id]: draft }));
      },
      updateDraftFields(id, partial) {
        setDrafts((prev) => {
          const existing = prev[id];
          if (!existing) return prev;
          const next: CallDraft = { ...existing, ...partial };
          return { ...prev, [id]: next };
        });
      },
    }),
    [drafts],
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}

export function useDraftsStore(): DraftsContextValue & {
  getDraft: (id: string) => CallDraft | undefined;
} {
  const ctx = useContext(DraftsContext);
  if (!ctx) {
    throw new Error("useDraftsStore must be used within DraftsProvider");
  }
  const getDraft = (id: string) => ctx.drafts[id];
  return { ...ctx, getDraft };
}

// --- Visits store: backed by visitsRepo (same source as New Visit & Calendar) ---

interface VisitsContextValue {
  visits: VisitSummary[];
  addVisit: (visit: VisitSummary) => void;
}

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

export function VisitsProvider({ children }: { children: React.ReactNode }) {
  const [visits, setVisits] = useState<VisitSummary[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (DEMO_MODE) {
      seedDemoDataIfEmpty();
    }
    let list = listVisits();
    if (list.length === 0) {
      MOCK_VISITS.forEach((v) => upsertVisit(v));
      list = listVisits();
    }
    const toSet = list;
    queueMicrotask(() => setVisits(toSet));
  }, []);

  const value = useMemo<VisitsContextValue>(
    () => ({
      visits,
      addVisit(visit) {
        upsertVisit(visit);
        setVisits(listVisits());
      },
    }),
    [visits],
  );

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
}

export function useVisitsStore(): VisitsContextValue {
  const ctx = useContext(VisitsContext);
  if (!ctx) {
    throw new Error("useVisitsStore must be used within VisitsProvider");
  }
  return ctx;
}

// --- Notes repo for Concierge Calendar ---

const NotesRepoContext = createContext<NotesRepo | undefined>(undefined);

export function NotesRepoProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => LocalNotesRepo, []);
  return (
    <NotesRepoContext.Provider value={repo}>{children}</NotesRepoContext.Provider>
  );
}

export function useNotesRepo(): NotesRepo {
  const ctx = useContext(NotesRepoContext);
  if (!ctx) {
    throw new Error("useNotesRepo must be used within NotesRepoProvider");
  }
  return ctx;
}


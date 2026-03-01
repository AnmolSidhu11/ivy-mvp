"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { VisitSummary } from "@/lib/mockVisits";
import type { DayClaim } from "@/lib/conciergeAgenda";
import type { Note } from "@/lib/notesRepo";
import {
  deriveAgendaItems,
  loadDayClaims,
  type TimelineItem,
} from "@/lib/conciergeAgenda";
import type { BuildDayAgendaOutput, OrchestratorResponse } from "@/lib/concierge/types";
import { AddToCalendarDropdown } from "@/components/AddToCalendarDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Local date as YYYY-MM-DD. */
function toDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  visits: VisitSummary[];
  /** Optional: if not provided, widget loads claims for today from localStorage in useEffect */
  claims?: DayClaim[];
  notes?: Note[];
};

/** Up to 3 visits: take unique visitIds from agenda (visit-type items), slice 3, then show all items for those visits (Pre-call, Visit, Post-call, Expense). */
function limitToThreeVisits(items: TimelineItem[]): TimelineItem[] {
  const visitIds = new Set<string>();
  for (const it of items) {
    if (it.visitId && (it.type === "Pre-call" || it.type === "Visit" || it.type === "Post-call" || it.type === "Expense")) {
      visitIds.add(it.visitId);
    }
  }
  const top3 = Array.from(visitIds).slice(0, 3);
  if (top3.length === 0) return items;
  return items.filter(
    (it) => !it.visitId || it.type === "Note" || top3.includes(it.visitId)
  );
}

export function DashboardTodayAgenda({ visits, claims: claimsProp, notes = [] }: Props) {
  const [todayYmd, setTodayYmd] = useState("");
  const [claimsForDay, setClaimsForDay] = useState<DayClaim[]>([]);
  const [dayPlanDraft, setDayPlanDraft] = useState<BuildDayAgendaOutput | null>(null);
  const [dayPlanLoading, setDayPlanLoading] = useState(false);
  const [dayPlanError, setDayPlanError] = useState<string | null>(null);

  // Compute today and load claims on client only (no hydration mismatch).
  useEffect(() => {
    const today = toDateYmd(new Date());
    setTodayYmd(today);
    const { claims } = loadDayClaims(today, visits);
    setClaimsForDay(claims);
  }, [visits]);

  const claims = claimsProp ?? claimsForDay;
  const agendaItems = useMemo(() => {
    if (!todayYmd) return [];
    return deriveAgendaItems(todayYmd, visits, claims, notes);
  }, [todayYmd, visits, claims, notes]);

  const displayItems = useMemo(() => limitToThreeVisits(agendaItems), [agendaItems]);
  const hasVisitItems = displayItems.some(
    (it) => it.type === "Pre-call" || it.type === "Visit" || it.type === "Post-call" || it.type === "Expense"
  );

  const handleGenerateDayPlan = async () => {
    if (!todayYmd) return;
    setDayPlanLoading(true);
    setDayPlanError(null);
    setDayPlanDraft(null);
    try {
      const res = await fetch("/api/concierge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "build_day_agenda",
          context: { dateYmd: todayYmd },
        }),
      });
      const data = (await res.json()) as OrchestratorResponse;
      if (!res.ok) throw new Error("Failed to generate day plan");
      if (data.status === "blocked") {
        setDayPlanError("Content blocked by compliance.");
        return;
      }
      if (data.output && "items" in data.output) {
        setDayPlanDraft(data.output as BuildDayAgendaOutput);
      }
    } catch (e) {
      setDayPlanError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDayPlanLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-white/60 bg-white/95 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-violet">
          Today (Concierge)
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Pre-call → Visit → Post-call → Expense
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Generate my day plan (orchestrator) */}
        {todayYmd && (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
            <button
              type="button"
              onClick={handleGenerateDayPlan}
              disabled={dayPlanLoading}
              className="rounded-full bg-violet/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet disabled:opacity-70"
            >
              {dayPlanLoading ? "Generating…" : "Generate my day plan"}
            </button>
            {dayPlanError && (
              <span className="text-xs text-red-600">{dayPlanError}</span>
            )}
          </div>
        )}
        {dayPlanDraft && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="mb-2 text-xs font-semibold text-amber-900">Draft day plan (confirm in calendar)</p>
            <ul className="space-y-1 text-xs text-amber-900">
              {dayPlanDraft.items.map((it, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[11px]">{it.time}</span>
                  <span className="font-medium">{it.type}</span>
                  <span>{it.label}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/calendar?date=${todayYmd}`}
              className="mt-2 inline-block rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              Apply to calendar view
            </Link>
          </div>
        )}
        {!todayYmd ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : !hasVisitItems ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">No visits scheduled for today.</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/new-visit"
                className="inline-flex rounded-full bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
              >
                Create Visit
              </Link>
              <Link
                href={`/calendar?date=${todayYmd}`}
                className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Open Calendar
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {displayItems
                .filter(
                  (it) =>
                    it.type === "Pre-call" ||
                    it.type === "Visit" ||
                    it.type === "Post-call" ||
                    it.type === "Expense"
                )
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-12 shrink-0 font-mono text-[11px] text-zinc-500">
                        {item.timeLabel}
                      </span>
                      <span
                        className={
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (item.type === "Visit"
                            ? "bg-violet/10 text-violet"
                            : item.type === "Expense"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-indigo-50 text-indigo-700")
                        }
                      >
                        {item.type}
                      </span>
                      {item.hcpName && (
                        <span className="font-medium text-zinc-900">{item.hcpName}</span>
                      )}
                      {item.location && (
                        <span className="text-zinc-500">{item.location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.primaryAction.href ? (
                        <Link
                          href={item.primaryAction.href}
                          className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
                        >
                          {item.primaryAction.label}
                        </Link>
                      ) : (
                        <span className="rounded-full bg-zinc-400 px-2.5 py-1 text-[11px] font-medium text-white">
                          {item.primaryAction.label}
                        </span>
                      )}
                      {item.visitId && (
                        <AddToCalendarDropdown
                          visitId={item.visitId}
                          hcpName={item.hcpName ?? ""}
                          dateYmd={todayYmd}
                          onDownload={() => {}}
                        />
                      )}
                    </div>
                  </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-2">
              <Link
                href={`/calendar?date=${todayYmd}`}
                className="text-xs font-medium text-violet hover:underline"
              >
                Open Calendar
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href="/new-visit"
                className="text-xs font-medium text-violet hover:underline"
              >
                Create Visit
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

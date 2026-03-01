"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useVisitsStore } from "@/lib/store";
import type { VisitSummary } from "@/lib/mockVisits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConciergePanel } from "@/components/ConciergePanel";

function textToLines(s: string): string[] {
  return s.split("\n").map((t) => t.trim()).filter(Boolean);
}
function linesToText(lines: string[]): string {
  return lines.join("\n");
}

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = typeof params.visitId === "string" ? params.visitId : "";
  const { visits, addVisit } = useVisitsStore();
  const visit = visits.find((v) => v.id === visitId);

  const [precallObjectives, setPrecallObjectives] = useState("");
  const [precallKeyMessages, setPrecallKeyMessages] = useState("");
  const [lastMeetingSummary, setLastMeetingSummary] = useState("");
  const [postcallSummary, setPostcallSummary] = useState("");
  const [objections, setObjections] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"visit" | "concierge">("visit");
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  useEffect(() => {
    if (!visit) return;
    const obj = linesToText(visit.precallObjectives ?? []);
    const key = linesToText(visit.precallKeyMessages ?? []);
    const last = visit.lastMeetingSummary ?? "";
    const post = visit.summary ?? "";
    const objec = linesToText(visit.objections ?? []);
    const next = linesToText(visit.nextActions ?? []);
    queueMicrotask(() => {
      setPrecallObjectives(obj);
      setPrecallKeyMessages(key);
      setLastMeetingSummary(last);
      setPostcallSummary(post);
      setObjections(objec);
      setNextSteps(next);
    });
  }, [visit]);

  useEffect(() => {
    if (!tabFromUrl) return;
    if (tabFromUrl === "precall" || tabFromUrl === "capture" || tabFromUrl === "postcall") {
      const el = document.getElementById(tabFromUrl);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tabFromUrl]);

  const handleSave = () => {
    if (!visit) return;
    const updated: VisitSummary = {
      ...visit,
      precallObjectives: textToLines(precallObjectives),
      precallKeyMessages: textToLines(precallKeyMessages),
      lastMeetingSummary: lastMeetingSummary.trim() || undefined,
      summary: postcallSummary.trim(),
      objections: textToLines(objections),
      nextActions: textToLines(nextSteps),
    };
    addVisit(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!visitId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet p-6 font-sans">
        <p className="text-zinc-600">Missing visit ID.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet p-6 font-sans">
        <p className="text-zinc-600">Visit not found: {visitId}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-violet">
              Visit: {visit.hcpName}
            </h1>
            <p className="text-sm text-zinc-600">
              {visit.date} · {visit.channel}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-violet hover:bg-violet/90">
              {saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="mb-4 flex gap-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab("visit")}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              activeTab === "visit" ? "border border-zinc-200 border-b-0 bg-white text-violet" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Visit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("concierge")}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              activeTab === "concierge" ? "border border-zinc-200 border-b-0 bg-white text-violet" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Ask Concierge
          </button>
        </div>

        {activeTab === "concierge" ? (
          <ConciergePanel variant="tab" />
        ) : (
        <>
        <section id="precall" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pre-call brief</CardTitle>
              <p className="text-xs text-zinc-500">Objectives, key messages, last meeting summary. Editable.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Objectives (one per line, up to 3)</label>
                <textarea
                  value={precallObjectives}
                  onChange={(e) => setPrecallObjectives(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="e.g. Confirm coverage workflow&#10;Align on next touchpoint"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Key messages</label>
                <textarea
                  value={precallKeyMessages}
                  onChange={(e) => setPrecallKeyMessages(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="Stay within approved indications..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Last meeting summary</label>
                <textarea
                  value={lastMeetingSummary}
                  onChange={(e) => setLastMeetingSummary(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="Brief recap of previous discussion..."
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="capture" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Capture notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-700">
              Record visit notes and key points. Use the calendar agenda to open capture or paste notes into the post-call section below.
            </CardContent>
          </Card>
        </section>

        <section id="postcall" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Post-call summary</CardTitle>
              <p className="text-xs text-zinc-500">Discussion summary, objections, next steps. Editable.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Discussion summary</label>
                <textarea
                  value={postcallSummary}
                  onChange={(e) => setPostcallSummary(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="What was discussed..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Objections (one per line)</label>
                <textarea
                  value={objections}
                  onChange={(e) => setObjections(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="Any concerns raised..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Next steps (one per line)</label>
                <textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                  placeholder="Follow-up items..."
                />
              </div>
            </CardContent>
          </Card>
        </section>
        </>
        )}
      </div>
    </div>
  );
}

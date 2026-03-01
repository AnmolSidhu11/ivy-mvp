"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useVisitsStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VisitDetailPage() {
  const params = useParams();
  const visitId = typeof params.visitId === "string" ? params.visitId : "";
  const { visits } = useVisitsStore();
  const visit = visits.find((v) => v.id === visitId);

  if (!visitId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet p-6 font-sans">
        <p className="text-zinc-600">Missing visit ID.</p>
        <Link href="/calendar">
          <Button variant="outline" className="mt-4">
            Back to Calendar
          </Button>
        </Link>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet p-6 font-sans">
        <p className="text-zinc-600">Visit not found: {visitId}</p>
        <Link href="/calendar">
          <Button variant="outline" className="mt-4">
            Back to Calendar
          </Button>
        </Link>
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
          <Link href="/calendar">
            <Button variant="outline" size="sm">
              Back to Calendar
            </Button>
          </Link>
        </div>

        <section id="precall" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pre-call brief</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-700">
              Review logistics, access, and support before the visit. Use the Concierge pre-call API
              or paste your brief here.
            </CardContent>
          </Card>
        </section>

        <section id="capture" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Capture notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-700">
              Record visit notes and key points. Link to capture workflow or paste notes here.
            </CardContent>
          </Card>
        </section>

        <section id="postcall" className="scroll-mt-6">
          <Card className="mb-4 rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Post-call summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-700">
              Draft post-call summary and next actions. Use the Concierge post-call API or edit
              here.
            </CardContent>
          </Card>
        </section>

        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white/95 p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Summary</h2>
          <p className="text-sm text-zinc-700">{visit.summary}</p>
          {visit.keyPoints.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-semibold text-zinc-600">Key points</h3>
              <ul className="list-inside list-disc text-sm text-zinc-700">
                {visit.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
          {visit.nextActions.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-semibold text-zinc-600">Next actions</h3>
              <ul className="list-inside list-disc text-sm text-zinc-700">
                {visit.nextActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

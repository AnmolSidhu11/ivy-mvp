"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  type VisitSummary,
  type ConfidenceLevel,
} from "@/lib/mockVisits";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useVisitsStore } from "@/lib/store";
import { CaptureCard, type CaptureStatus } from "@/components/CaptureCard";

function confidenceVariant(level: ConfidenceLevel): "success" | "warning" | "destructive" {
  if (level === "high") return "success";
  if (level === "med") return "warning";
  return "destructive";
}

function confidenceLabel(level: ConfidenceLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export default function DashboardPage() {
  const { visits } = useVisitsStore();
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("idle");
  const [selectedVisit, setSelectedVisit] = useState<VisitSummary | null>(
    () => (visits[0] ?? null)
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (captureStatus === "processing") {
      timer = setTimeout(() => {
        setCaptureStatus("done");
        setSelectedVisit((current) => current ?? (visits[0] ?? null));
        toast.success("Processing complete");
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [captureStatus, visits]);

  const handleStartProcessing = useCallback(() => {
    setCaptureStatus("processing");
  }, []);

  const handleUploadChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      toast.info("Upload received");
      setCaptureStatus("processing");
      e.target.value = "";
    },
    []
  );

  const handleCopySummary = useCallback(() => {
    if (!selectedVisit) return;
    const text = [
      `${selectedVisit.hcpName} · ${selectedVisit.date} · ${selectedVisit.channel}`,
      selectedVisit.summary,
      "Key points:",
      ...selectedVisit.keyPoints,
      "Objections:",
      ...selectedVisit.objections,
      "Next actions:",
      ...selectedVisit.nextActions,
    ].join("\n");
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  }, [selectedVisit]);

  const handleExportJson = useCallback(() => {
    if (!selectedVisit) return;
    const blob = new Blob([JSON.stringify(selectedVisit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visit-${selectedVisit.id}-${selectedVisit.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }, [selectedVisit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10 lg:px-8 lg:py-12">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-sm backdrop-blur-sm md:flex">
          <div className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Navigation
          </div>
          <nav className="space-y-1.5 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl bg-violet/10 px-3 py-2.5 text-xs font-medium text-violet hover:bg-violet/15 transition-colors"
            >
              <span>Dashboard</span>
              <span className="h-1.5 w-1.5 rounded-full bg-violet" />
            </Link>
            <Link
              href="/new-visit"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-lavender/50 hover:text-violet transition-colors"
            >
              New Visit
            </Link>
            <Link
              href="/expense"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-lavender/50 hover:text-violet transition-colors"
            >
              Expense
            </Link>
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-lavender/50 hover:text-violet transition-colors"
            >
              History
            </button>
            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-lavender/50 hover:text-violet transition-colors"
            >
              Settings
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 space-y-6">
          <header className="flex items-center justify-between gap-4 border-b border-white/40 pb-6">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-semibold tracking-tight text-violet">IVY</h1>
              <p className="text-sm text-zinc-600">Intelligent Visit Assistant</p>
              <p className="text-xs text-zinc-500">Your AI Field Concierge</p>
              <p className="mt-2 text-sm text-zinc-600">
                Capture visits, summarize, and validate with confidence.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="font-medium text-zinc-800">Anmol Sidhu</div>
                <div className="text-zinc-500">Field Rep · GTA West</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet text-sm font-semibold text-white shadow-sm">
                AS
              </div>
            </div>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            {/* A) Capture */}
            <CaptureCard
              captureStatus={captureStatus}
              onStartProcessing={handleStartProcessing}
              onUploadChange={handleUploadChange}
            />

            {/* B) Visit Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Summary</CardTitle>
                <CardDescription>
                  Structured summary for the selected or latest visit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedVisit ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-zinc-900">
                        {selectedVisit.hcpName}
                      </span>
                      <span className="text-zinc-500">{selectedVisit.date}</span>
                      <span className="text-zinc-500">{selectedVisit.channel}</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedVisit.products.map((p) => (
                          <Badge key={p} variant="secondary">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-700">{selectedVisit.summary}</p>
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Key points
                      </div>
                      <ul className="list-disc space-y-1 pl-4 text-xs">
                        {selectedVisit.keyPoints.map((kp) => (
                          <li key={kp}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                    {selectedVisit.objections.length > 0 && (
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Objections
                        </div>
                        <ul className="list-disc space-y-1 pl-4 text-xs">
                          {selectedVisit.objections.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Next actions
                      </div>
                      <ul className="list-disc space-y-1 pl-4 text-xs">
                        {selectedVisit.nextActions.map((na) => (
                          <li key={na}>{na}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopySummary}>
                        Copy Summary
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportJson}>
                        Export JSON
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-600">
                    No visit selected. Start recording, upload audio, or pick from
                    History.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* C) Quality Checks */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Checks</CardTitle>
                <CardDescription>
                  Required fields and confidence per section.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedVisit ? (
                  <>
                    <div className="space-y-2">
                      {selectedVisit.requiredFieldLabels.map((label, i) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedVisit.requiredFieldsPresent[i]}
                            disabled
                          />
                          <span className="text-zinc-700">{label}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">Hallucination risk</span>
                      <Switch
                        checked={selectedVisit.hallucinationRisk}
                        disabled
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-zinc-500 w-full">Confidence:</span>
                      <Badge variant={confidenceVariant(selectedVisit.confidence.summary)}>
                        Summary {confidenceLabel(selectedVisit.confidence.summary)}
                      </Badge>
                      <Badge variant={confidenceVariant(selectedVisit.confidence.keyPoints)}>
                        Key points {confidenceLabel(selectedVisit.confidence.keyPoints)}
                      </Badge>
                      <Badge variant={confidenceVariant(selectedVisit.confidence.objections)}>
                        Objections {confidenceLabel(selectedVisit.confidence.objections)}
                      </Badge>
                      <Badge variant={confidenceVariant(selectedVisit.confidence.nextActions)}>
                        Next actions {confidenceLabel(selectedVisit.confidence.nextActions)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-600">
                    Select a visit to see quality checks and confidence.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* D) History */}
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>
                  Last 10 visits. Click a row to load its summary.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>HCP</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.slice(0, 10).map((visit) => {
                      const isSelected =
                        selectedVisit && selectedVisit.id === visit.id;
                      return (
                        <TableRow
                          key={visit.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedVisit(visit)}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className="text-xs">{visit.date}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {visit.hcpName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {visit.products.map((p) => (
                                <Badge key={p} variant="secondary" className="text-[10px]">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {visit.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

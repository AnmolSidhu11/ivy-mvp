"use client";

import { useEffect, useState, useCallback } from "react";
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
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardTodayAgenda } from "@/components/DashboardTodayAgenda";
import { VisitFormLiveFill } from "@/components/VisitFormLiveFill";
import { MissingFieldsTracker } from "@/components/MissingFieldsTracker";
import { AssistantFollowUpPanel } from "@/components/AssistantFollowUpPanel";
import {
  createEmptyFormState,
  extractFromText,
  type VisitFormState,
  type VisitFormMeta,
} from "@/lib/visitCaptureForm";

function confidenceVariant(level: ConfidenceLevel): "success" | "warning" | "destructive" {
  if (level === "high") return "success";
  if (level === "med") return "warning";
  return "destructive";
}

function confidenceLabel(level: ConfidenceLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Deterministic sample transcript when user clicks "Use Recording" (no external STT). */
const SAMPLE_TRANSCRIPT =
  "Visit with Dr. Smith. Objective was to discuss Toujeo and dosing. Asked about titration. Concern was cost. Next step is to send samples and follow up in two weeks.";

export default function DashboardPage() {
  const { visits } = useVisitsStore();
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("idle");
  const [selectedVisit, setSelectedVisit] = useState<VisitSummary | null>(
    () => (visits[0] ?? null)
  );
  const [formState, setFormState] = useState<VisitFormState>(() => createEmptyFormState());
  const [formMeta, setFormMeta] = useState<VisitFormMeta>({});
  const [transcriptionText, setTranscriptionText] = useState("");
  const [voicePrompt, setVoicePrompt] = useState("");

  useEffect(() => {
    if (!transcriptionText.trim()) return;
    const t = window.setTimeout(() => {
      const { updates, meta } = extractFromText(transcriptionText);
      if (Object.keys(updates).length > 0) {
        setFormState((prev) => ({ ...prev, ...updates }));
        setFormMeta((prev) => ({ ...prev, ...meta }));
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [transcriptionText]);

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

  const handleRecordingReady = useCallback((_blob: Blob) => {
    setTranscriptionText(SAMPLE_TRANSCRIPT);
    toast.info("Sample transcript applied. Edit form or paste your own.");
  }, []);

  const handleUploadChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      toast.info("Upload received");
      setCaptureStatus("processing");
      setTranscriptionText(SAMPLE_TRANSCRIPT);
      e.target.value = "";
    },
    []
  );

  const handleFormChange = useCallback((updates: Partial<VisitFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

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
        <DashboardNav />

        {/* Main content */}
        <main className="flex-1 space-y-6">
          <DashboardTodayAgenda visits={visits} />

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

          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-violet">Voice Capture</h2>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr_280px]">
              <div className="space-y-3">
                <CaptureCard
                  captureStatus={captureStatus}
                  onStartProcessing={handleStartProcessing}
                  onUploadChange={handleUploadChange}
                  onRecordingReady={handleRecordingReady}
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Transcription</CardTitle>
                    <CardDescription className="text-xs">
                      Paste or edit. Form updates from phrases like &ldquo;objective is&rdquo;, &ldquo;next step&rdquo;, etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
                      placeholder="Paste transcription or type notes…"
                      value={transcriptionText}
                      onChange={(e) => setTranscriptionText(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
              <VisitFormLiveFill
                state={formState}
                meta={formMeta}
                onChange={handleFormChange}
              />
              <div className="space-y-3">
                <MissingFieldsTracker formState={formState} />
                <AssistantFollowUpPanel
                  formState={formState}
                  voicePrompt={voicePrompt}
                  onVoicePromptChange={setVoicePrompt}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
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

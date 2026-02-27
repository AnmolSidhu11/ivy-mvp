"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type VisitSummary,
  type ConfidenceLevel,
  MOCK_VISITS,
} from "@/lib/mockVisits";
import { useVisitsStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type Step = "capture" | "processing" | "review" | "saved";
type CaptureState = "idle" | "recording";

function confidenceVariant(level: ConfidenceLevel): "success" | "warning" | "destructive" {
  if (level === "high") return "success";
  if (level === "med") return "warning";
  return "destructive";
}

function confidenceLabel(level: ConfidenceLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function createInitialVisit(): VisitSummary {
  const base = MOCK_VISITS[0];
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10);
  return {
    ...base,
    id: `new-${ymd.replace(/-/g, "")}`,
    date: ymd,
    status: "draft",
  };
}

export default function NewVisitPage() {
  const router = useRouter();
  const { addVisit } = useVisitsStore();

  const [step, setStep] = useState<Step>("capture");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [visit, setVisit] = useState<VisitSummary | null>(null);
  const [productsInput, setProductsInput] = useState("");

  const isProcessing = step === "processing";
  const isReview = step === "review";

  useEffect(() => {
    if (!isProcessing) return;
    const timer = setTimeout(() => {
      const nextVisit = createInitialVisit();
      setVisit(nextVisit);
      setProductsInput(nextVisit.products.join(", "));
      setStep("review");
      toast.success("Processing complete");
    }, 1500);
    return () => clearTimeout(timer);
  }, [isProcessing]);

  const currentStepIndex = useMemo(() => {
    const order: Step[] = ["capture", "processing", "review", "saved"];
    return order.indexOf(step);
  }, [step]);

  const handleStartRecording = useCallback(() => {
    setCaptureState("recording");
  }, []);

  const handleStopRecording = useCallback(() => {
    setCaptureState("idle");
    setStep("processing");
  }, []);

  const handleUploadChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      toast.info("Upload received");
      setStep("processing");
      e.target.value = "";
    },
    [],
  );

  const updateVisit = useCallback((partial: Partial<VisitSummary>) => {
    setVisit((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const updateListItem = useCallback(
    (field: "keyPoints" | "objections" | "nextActions", index: number, value: string) => {
      setVisit((prev) => {
        if (!prev) return prev;
        const next = [...prev[field]];
        next[index] = value;
        return { ...prev, [field]: next };
      });
    },
    [],
  );

  const handleAddListItem = useCallback(
    (field: "keyPoints" | "objections" | "nextActions") => {
      setVisit((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: [...prev[field], ""] };
      });
    },
    [],
  );

  const handleProductsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.target.value;
      setProductsInput(value);
      const products = value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      updateVisit({ products });
    },
    [updateVisit],
  );

  const handleToggleRequiredField = useCallback((index: number) => {
    setVisit((prev) => {
      if (!prev) return prev;
      const next = [...prev.requiredFieldsPresent];
      next[index] = !next[index];
      return { ...prev, requiredFieldsPresent: next };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!visit) return;
    const toSave: VisitSummary = {
      ...visit,
      status: "completed",
    };
    addVisit(toSave);
    setStep("saved");
    toast.success("Saved");
    router.push("/dashboard");
  }, [addVisit, router, visit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 lg:px-8 lg:py-12">
        <header className="flex items-center justify-between gap-4 border-b border-white/40 pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-violet">New Visit</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Record or upload to generate a structured summary.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </header>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          {[
            { id: "capture", label: "Capture" },
            { id: "processing", label: "Processing" },
            { id: "review", label: "Review" },
            { id: "saved", label: "Saved" },
          ].map((s, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] " +
                    (isActive
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 bg-white text-zinc-500")
                  }
                >
                  {index + 1}
                </div>
                <span
                  className={
                    isActive
                      ? "font-medium text-zinc-900"
                      : isDone
                        ? "text-zinc-700"
                        : "text-zinc-500"
                  }
                >
                  {s.label}
                </span>
                {index < 3 && <div className="h-px w-6 bg-zinc-200" />}
              </div>
            );
          })}
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Capture</CardTitle>
              <CardDescription>
                Start a quick recording or upload an audio file to begin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {captureState !== "recording" ? (
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleStartRecording}
                    disabled={isProcessing || isReview}
                  >
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    type="button"
                    variant="destructive"
                    onClick={handleStopRecording}
                  >
                    Stop Recording
                  </Button>
                )}
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleUploadChange}
                    disabled={isProcessing || isReview}
                  />
                  <span className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    Upload audio
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-500">
                Status:{" "}
                <span className="font-medium">
                  {step === "capture"
                    ? captureState === "recording"
                      ? "Recording"
                      : "Idle"
                    : step === "processing"
                      ? "Processing"
                      : step === "review"
                        ? "Review"
                        : "Saved"}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
              <CardDescription>
                IVY generates a first-pass summary from your capture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {step === "processing" && (
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-zinc-300 border-t-zinc-900" />
                  <span>Generating summary...</span>
                </div>
              )}
              {step === "capture" && (
                <p className="text-xs text-zinc-500">
                  Once you stop recording or upload audio, IVY will briefly process the
                  transcript and draft a visit summary.
                </p>
              )}
              {step === "review" && (
                <p className="text-xs text-emerald-600">
                  Summary generated. Review and refine before saving.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Review</CardTitle>
              <CardDescription>
                Adjust key details before saving this visit to history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!visit && step !== "saved" && (
                <p className="text-xs text-zinc-500">
                  Capture or upload first to generate a draft summary.
                </p>
              )}
              {visit && (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        HCP name
                      </label>
                      <input
                        type="text"
                        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                        value={visit.hcpName}
                        onChange={(e) => updateVisit({ hcpName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Date
                      </label>
                      <input
                        type="text"
                        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                        value={visit.date}
                        onChange={(e) => updateVisit({ date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Channel
                      </label>
                      <input
                        type="text"
                        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                        value={visit.channel}
                        onChange={(e) => updateVisit({ channel: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Summary
                    </label>
                    <textarea
                      className="min-h-[72px] w-full rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-900"
                      value={visit.summary}
                      onChange={(e) => updateVisit({ summary: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Key points
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleAddListItem("keyPoints")}
                        >
                          + Add
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {visit.keyPoints.map((kp, idx) => (
                          <input
                            key={idx}
                            type="text"
                            className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                            value={kp}
                            onChange={(e) =>
                              updateListItem("keyPoints", idx, e.target.value)
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Objections
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleAddListItem("objections")}
                        >
                          + Add
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {visit.objections.map((o, idx) => (
                          <input
                            key={idx}
                            type="text"
                            className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                            value={o}
                            onChange={(e) =>
                              updateListItem("objections", idx, e.target.value)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Next actions
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleAddListItem("nextActions")}
                        >
                          + Add
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {visit.nextActions.map((na, idx) => (
                          <input
                            key={idx}
                            type="text"
                            className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                            value={na}
                            onChange={(e) =>
                              updateListItem("nextActions", idx, e.target.value)
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Products
                      </span>
                      <input
                        type="text"
                        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
                        value={productsInput}
                        onChange={handleProductsChange}
                        placeholder="Dupixent, ALTUVIIIO"
                      />
                      <div className="flex flex-wrap gap-1">
                        {visit.products.map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Required fields
                      </span>
                      <div className="space-y-1">
                        {visit.requiredFieldLabels.map((label, idx) => (
                          <label
                            key={label}
                            className="flex items-center gap-2 text-xs text-zinc-700"
                          >
                            <Checkbox
                              checked={visit.requiredFieldsPresent[idx]}
                              onCheckedChange={() => handleToggleRequiredField(idx)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-700">Hallucination risk</span>
                        <Switch
                          checked={visit.hallucinationRisk}
                          onCheckedChange={(checked) =>
                            updateVisit({ hallucinationRisk: Boolean(checked) })
                          }
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <span className="text-zinc-500">Confidence:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge
                            variant={confidenceVariant(visit.confidence.summary)}
                            className="text-[10px]"
                          >
                            Summary {confidenceLabel(visit.confidence.summary)}
                          </Badge>
                          <Badge
                            variant={confidenceVariant(visit.confidence.keyPoints)}
                            className="text-[10px]"
                          >
                            Key points {confidenceLabel(visit.confidence.keyPoints)}
                          </Badge>
                          <Badge
                            variant={confidenceVariant(visit.confidence.objections)}
                            className="text-[10px]"
                          >
                            Objections {confidenceLabel(visit.confidence.objections)}
                          </Badge>
                          <Badge
                            variant={confidenceVariant(visit.confidence.nextActions)}
                            className="text-[10px]"
                          >
                            Next actions {confidenceLabel(visit.confidence.nextActions)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/dashboard")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      disabled={step === "saved"}
                    >
                      Save Visit
                    </Button>
                  </div>
                </>
              )}
              {step === "saved" && !visit && (
                <p className="text-xs text-emerald-600">
                  Visit saved. Redirecting to dashboard history.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}


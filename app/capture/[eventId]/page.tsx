"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { getEventById, getHcpById } from "@/lib/mock";
import { useDraftsStore } from "@/lib/store";
import { CallDraft } from "@/lib/types";
import { REQUIRED_FIELDS, computeMissingFields } from "@/lib/validators";

const VOICE_PRESETS: { id: string; label: string; text: string }[] = [
  {
    id: "dupixent_access",
    label: "Dupixent – Access",
    text:
      "We reviewed Dupixent coverage steps for eczema clinics, focusing on prior authorization tips and using the coverage checklist. Office staff asked for a short email summary they can share with new team members.",
  },
  {
    id: "beyfortus_workflow",
    label: "Beyfortus – Workflow",
    text:
      "We walked through the Beyfortus clinic workflow, from scheduling to charting. The coordinator wants a one‑pager to align nurses on documentation and vaccine storage checks.",
  },
  {
    id: "altuviiio_medinfo",
    label: "ALTUVIIIO – Med Info",
    text:
      "The HCP raised a question about adjusting ALTUVIIIO timing around travel. I reminded them I cannot give individual dosing guidance and suggested contacting Medical Information while I share the approved dosing guide.",
  },
  {
    id: "safety_hypersensitivity",
    label: "Safety – Hypersensitivity",
    text:
      "The HCP mentioned a recent hypersensitivity reaction with hives and a spreading rash after therapy. The office sent the person to the ER for evaluation, and follow‑up confirmed recovery without hospitalization.",
  },
];

export default function CapturePage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [mode, setMode] = useState<"text" | "voice" | "photo">("text");
  const [error, setError] = useState<string | null>(null);
  const { drafts, createDraftFromCapture } = useDraftsStore();

  const event = getEventById(eventId);
  const hcp = event ? getHcpById(event.hcpId) : undefined;

  const existingDraft: CallDraft | undefined = useMemo(
    () =>
      Object.values(drafts).find(
        (d) => d.eventId === eventId,
      ),
    [drafts, eventId],
  );

  const previewDraft: CallDraft | null = useMemo(() => {
    if (!event) return null;
    const base: CallDraft =
      existingDraft ?? {
        id: "preview",
        eventId,
        hcpId: event.hcpId,
        userId: "u_1001",
        transcript: "",
        channel: "",
        call_objective: "",
        products_discussed: [],
        notes_summary: "",
        createdAt: new Date().toISOString(),
        safety: null,
      };
    const combined = [transcript, ocrText].filter(Boolean).join("\n\n");
    return {
      ...base,
      transcript: combined,
      notes_summary: combined.trim().slice(0, 160),
    };
  }, [event, existingDraft, eventId, ocrText, transcript]);

  const requiredProgress = useMemo(() => {
    if (!previewDraft) {
      return { done: 0, total: REQUIRED_FIELDS.length };
    }
    const missing = computeMissingFields(previewDraft);
    const total = REQUIRED_FIELDS.length;
    const done = total - missing.length;
    return { done, total };
  }, [previewDraft]);

  const handleGenerate = () => {
    const combined = [transcript, ocrText].filter(Boolean).join("\n\n").trim();
    if (!combined) {
      setError("Please enter a short transcript before generating a report.");
      return;
    }
    setError(null);
    const draft = createDraftFromCapture(eventId, combined);
    router.push(`/confirm/${draft.id}`);
  };
  const handleVoicePreset = (text: string) => {
    setTranscript(text);
    setError(null);
  };

  return (
    <AppShell title="Capture call" backHref="/dashboard">
      {event && hcp ? (
        <Card title="Context">
          <p className="text-sm font-medium">
            {hcp.name} · {hcp.specialty}
          </p>
          <p className="text-sm text-zinc-700">
            {event.when} · {hcp.clinic}
          </p>
        </Card>
      ) : null}

      <Card title="Capture mode">
        <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-0.5 text-xs">
          {(["text", "voice", "photo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "px-3 py-1 rounded-full transition-colors " +
                (mode === m
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-800 hover:bg-zinc-200")
              }
            >
              {m === "text" ? "Text" : m === "voice" ? "Voice (stub)" : "Photo (stub)"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Paste or type a brief call transcript. For voice/photo, use the stubs to simulate
          capture.
        </p>

        <textarea
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          rows={mode === "photo" ? 4 : 8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            mode === "voice"
              ? "Voice transcript will appear here…"
              : "Type or paste transcript notes…"
          }
        />

        {mode === "voice" ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-zinc-700">Voice presets (stub)</p>
            <div className="flex flex-wrap gap-2">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleVoicePreset(preset.text)}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-3 py-1.5 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {mode === "photo" ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-zinc-600">
              OCR text (stub) – paste the text you&apos;d expect from a photo of handwritten
              notes.
            </p>
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              rows={4}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="e.g., 'Patient reported doing well overall, occasional itching at night...'"
            />
          </div>
        ) : null}

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        <p className="mt-3 text-xs text-zinc-600">
          Required fields progress:{" "}
          <span className="font-medium">
            {requiredProgress.done}/{requiredProgress.total}
          </span>{" "}
          complete (will be refined on the next screen).
        </p>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Generate report
        </button>
      </div>
    </AppShell>
  );
}


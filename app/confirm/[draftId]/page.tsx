"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { FieldChecklist } from "@/components/FieldChecklist";
import { MissingFieldsForm } from "@/components/MissingFieldsForm";
import { useDraftsStore } from "@/lib/store";
import {
  computeMissingFields,
  computeSafetyMissing,
  getRequiredFieldStatus,
  isDraftComplete,
  isSafetyComplete,
} from "@/lib/validators";
import { detectAe } from "@/lib/ae";
import type {
  CallObjective,
  Channel,
  DraftFieldKey,
  SafetyFieldKey,
  SafetyCaseDraft,
} from "@/lib/types";

function initialSafetyStub(draftTranscript: string, products: string[]): SafetyCaseDraft {
  return {
    reporter_contact: "",
    suspect_product: products[0] ?? "",
    event_onset_date: "",
    seriousness: "",
    outcome: "",
    medical_intervention: "",
  };
}

function hasPatientIdentifiers(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.includes("dob") || lower.includes("date of birth") || lower.includes("mrn")) {
    return true;
  }
  // crude heuristic: long digit sequences
  const digitSeq = value.replace(/\D+/g, "");
  return digitSeq.length >= 8;
}

export default function ConfirmPage() {
  const params = useParams<{ draftId: string }>();
  const draftId = params.draftId;
  const { drafts, updateDraftFields } = useDraftsStore();
  const draft = drafts[draftId];

  if (!draft) {
    return (
      <AppShell title="Confirm report" backHref="/dashboard">
        <Card title="Draft not found">
          <p className="text-sm text-zinc-700">
            We couldn&apos;t find a draft for ID{" "}
            <span className="font-mono">{draftId}</span>.
          </p>
          <p className="text-sm text-zinc-700">
            This can happen if the browser storage was cleared or the draft was never created.
          </p>
          <div className="mt-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Go back to dashboard
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  const missing = computeMissingFields(draft);

  const handleMissingSubmit = (values: Partial<Record<DraftFieldKey, string>>) => {
    updateDraftFields(draft.id, {
      channel: values.channel ? (values.channel.trim() as Channel) : draft.channel,
      call_objective: values.call_objective
        ? (values.call_objective.trim() as CallObjective)
        : draft.call_objective,
      products_discussed: values.products_discussed
        ? values.products_discussed
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : draft.products_discussed,
      notes_summary: values.notes_summary
        ? values.notes_summary.trim()
        : draft.notes_summary,
    });
  };

  const status = getRequiredFieldStatus(draft);
  const baseComplete = isDraftComplete(draft);

  const combinedText = [draft.transcript, draft.notes_summary].join("\n").toLowerCase();
  const aeDetected = detectAe(combinedText);

  const currentSafety: SafetyCaseDraft | null =
    (draft.safety as SafetyCaseDraft | null | undefined) ??
    (aeDetected ? initialSafetyStub(draft.transcript, draft.products_discussed) : null);

  const safetyMissing = aeDetected ? computeSafetyMissing(currentSafety) : [];
  const safetyComplete = !aeDetected || isSafetyComplete(currentSafety);

  const effectiveComplete = baseComplete && safetyComplete;

  const handleSafetySubmit = (values: Partial<Record<SafetyFieldKey, string>>) => {
    if (!aeDetected) return;
    const existing = currentSafety ?? initialSafetyStub(draft.transcript, draft.products_discussed);
    const next: SafetyCaseDraft = {
      ...existing,
      reporter_contact:
        values.reporter_contact !== undefined
          ? values.reporter_contact.trim()
          : existing.reporter_contact,
      suspect_product:
        values.suspect_product !== undefined
          ? values.suspect_product.trim()
          : existing.suspect_product,
      event_onset_date:
        values.event_onset_date !== undefined
          ? values.event_onset_date.trim()
          : existing.event_onset_date,
      seriousness:
        (values.seriousness as SafetyCaseDraft["seriousness"]) ?? existing.seriousness,
      outcome: (values.outcome as SafetyCaseDraft["outcome"]) ?? existing.outcome,
      medical_intervention:
        (values.medical_intervention as SafetyCaseDraft["medical_intervention"]) ??
        existing.medical_intervention,
    };

    // prohibit simple patient identifiers in reporter_contact
    if (hasPatientIdentifiers(next.reporter_contact)) {
      alert(
        "Please remove patient identifiers (name, DOB, address, phone, MRN) from the reporter contact field.",
      );
      return;
    }

    updateDraftFields(draft.id, { safety: next });
  };

  const safetyFieldsToAsk = safetyMissing.slice(0, 3);

  return (
    <AppShell title="Confirm & submit" backHref="/dashboard">
      <Card title="Draft summary">
        <p className="text-sm text-zinc-700">
          Draft ID: <span className="font-mono">{draft.id}</span>
        </p>
        <p className="text-sm text-zinc-700">
          Created at:{" "}
          <span className="font-mono">
            {new Date(draft.createdAt).toLocaleString(undefined, {
              hour12: false,
            })}
          </span>
        </p>
        <p className="mt-2 text-sm text-zinc-800">
          <span className="font-medium">Notes summary:</span>{" "}
          {draft.notes_summary || "Not set yet."}
        </p>
      </Card>

      <Card title="Required fields">
        <FieldChecklist items={status} />
      </Card>

      <Card title="Fill missing fields">
        <MissingFieldsForm
          draftId={draft.id}
          missing={missing}
          onSubmit={handleMissingSubmit}
        />
      </Card>

      {aeDetected ? (
        <Card title="Safety follow-up required">
          <p className="text-xs text-amber-700">
            Potential adverse event detected in the transcript. Collect minimum safety
            information below. Do not include patient identifiers (name, DOB, address,
            phone, MRN).
          </p>
          {safetyFieldsToAsk.length === 0 ? (
            <p className="mt-2 text-xs text-emerald-700">
              Safety minimum information looks complete.
            </p>
          ) : (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget as HTMLFormElement);
                const values: Partial<Record<SafetyFieldKey, string>> = {};
                safetyFieldsToAsk.forEach((key) => {
                  const v = formData.get(key) as string | null;
                  if (v != null) values[key] = v;
                });
                handleSafetySubmit(values);
              }}
            >
              {safetyFieldsToAsk.map((key) => {
                const labelMap: Record<SafetyFieldKey, string> = {
                  reporter_contact: "Reporter contact (office-only, no patient info)",
                  suspect_product: "Suspect product",
                  event_onset_date: "Onset date (approximate is OK)",
                  seriousness: "Seriousness (serious, non_serious, unknown)",
                  outcome: "Outcome (recovered, recovering, not_recovered, unknown)",
                  medical_intervention:
                    "Medical intervention (er_visit, hospitalization, none, unknown)",
                };
                const isTextArea = key === "reporter_contact";
                return (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-700">
                      {labelMap[key]}
                    </label>
                    {isTextArea ? (
                      <textarea
                        name={key}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        defaultValue=""
                      />
                    ) : (
                      <input
                        name={key}
                        type="text"
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        defaultValue=""
                      />
                    )}
                  </div>
                );
              })}
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Save safety answers
              </button>
            </form>
          )}
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-500"
        >
          Save as draft
        </button>
        <button
          type="button"
          disabled={!effectiveComplete}
          className={
            "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium " +
            (effectiveComplete
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-zinc-300 text-zinc-600 cursor-not-allowed")
          }
        >
          Submit
        </button>
      </div>
    </AppShell>
  );
}


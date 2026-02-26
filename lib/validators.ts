import type {
  CallDraft,
  DraftFieldKey,
  RequiredFieldStatus,
  SafetyCaseDraft,
  SafetyFieldKey,
} from "./types";

export const REQUIRED_FIELDS: { key: DraftFieldKey; label: string }[] = [
  { key: "channel", label: "Channel" },
  { key: "call_objective", label: "Call objective" },
  { key: "products_discussed", label: "Products discussed" },
  { key: "notes_summary", label: "Notes summary" },
];

export function computeMissingFields(draft: CallDraft): DraftFieldKey[] {
  const missing: DraftFieldKey[] = [];

  if (!draft.channel) missing.push("channel");
  if (!draft.call_objective) missing.push("call_objective");
  if (!draft.products_discussed || draft.products_discussed.length === 0) {
    missing.push("products_discussed");
  }
  if (!draft.notes_summary || draft.notes_summary.trim().length < 20) {
    missing.push("notes_summary");
  }

  return missing;
}

export function getRequiredFieldStatus(draft: CallDraft): RequiredFieldStatus[] {
  const missing = new Set(computeMissingFields(draft));
  return REQUIRED_FIELDS.map(({ key, label }) => ({
    key,
    label,
    complete: !missing.has(key),
  }));
}

export function isDraftComplete(draft: CallDraft): boolean {
  return computeMissingFields(draft).length === 0;
}

const SAFETY_FIELDS: { key: SafetyFieldKey; label: string }[] = [
  { key: "reporter_contact", label: "Reporter contact" },
  { key: "suspect_product", label: "Suspect product" },
  { key: "event_onset_date", label: "Event onset date" },
  { key: "seriousness", label: "Seriousness" },
  { key: "outcome", label: "Outcome" },
  { key: "medical_intervention", label: "Medical intervention" },
];

export function computeSafetyMissing(safety: SafetyCaseDraft | null | undefined): SafetyFieldKey[] {
  if (!safety) {
    return SAFETY_FIELDS.map((f) => f.key);
  }
  const missing: SafetyFieldKey[] = [];
  if (!safety.reporter_contact.trim()) missing.push("reporter_contact");
  if (!safety.suspect_product.trim()) missing.push("suspect_product");
  if (!safety.event_onset_date.trim()) missing.push("event_onset_date");
  if (!safety.seriousness) missing.push("seriousness");
  if (!safety.outcome) missing.push("outcome");
  if (!safety.medical_intervention) missing.push("medical_intervention");
  return missing;
}

export function isSafetyComplete(safety: SafetyCaseDraft | null | undefined): boolean {
  return computeSafetyMissing(safety).length === 0;
}


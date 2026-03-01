/**
 * Live visit capture form state and deterministic extractor (no LLM).
 * Used by Voice Capture: form fields + "Updated from" edit history.
 */

export type VisitFormFieldKey =
  | "hcpName"
  | "visitObjective"
  | "productDiscussed"
  | "keyQuestionsAsked"
  | "objections"
  | "nextSteps"
  | "samplesMaterials"
  | "followUpDate";

export interface VisitFormState {
  hcpName: string;
  visitObjective: string;
  productDiscussed: string;
  keyQuestionsAsked: string;
  objections: string;
  nextSteps: string;
  samplesMaterials: string;
  followUpDate: string;
}

export interface VisitFormMeta {
  /** Optional "Updated from: [phrase]" per field when filled by extractor */
  hcpNameUpdatedFrom?: string;
  visitObjectiveUpdatedFrom?: string;
  productDiscussedUpdatedFrom?: string;
  keyQuestionsAskedUpdatedFrom?: string;
  objectionsUpdatedFrom?: string;
  nextStepsUpdatedFrom?: string;
  samplesMaterialsUpdatedFrom?: string;
  followUpDateUpdatedFrom?: string;
}

const REQUIRED_FIELDS: VisitFormFieldKey[] = [
  "hcpName",
  "visitObjective",
  "productDiscussed",
  "nextSteps",
];

export const VISIT_FORM_FIELD_LABELS: Record<VisitFormFieldKey, string> = {
  hcpName: "HCP Name",
  visitObjective: "Visit Objective",
  productDiscussed: "Product Discussed",
  keyQuestionsAsked: "Key Questions Asked",
  objections: "Objections",
  nextSteps: "Next Steps",
  samplesMaterials: "Samples / Materials",
  followUpDate: "Follow-up date",
};

export function getMissingFields(state: VisitFormState): VisitFormFieldKey[] {
  return REQUIRED_FIELDS.filter((key) => !state[key]?.trim());
}

export function createEmptyFormState(): VisitFormState {
  return {
    hcpName: "",
    visitObjective: "",
    productDiscussed: "",
    keyQuestionsAsked: "",
    objections: "",
    nextSteps: "",
    samplesMaterials: "",
    followUpDate: "",
  };
}

/** Deterministic phrase extraction. No external API. */
function extractPhrase(
  text: string,
  patterns: RegExp[],
  postProcess?: (s: string) => string
): { value: string; source: string } | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const raw = m[1].trim();
      const value = postProcess ? postProcess(raw) : raw;
      if (value) return { value, source: m[0].trim() };
    }
  }
  return null;
}

/**
 * Run deterministic extraction on transcription text.
 * Returns partial state updates and meta "Updated from" for each updated field.
 */
export function extractFromText(text: string): {
  updates: Partial<VisitFormState>;
  meta: Partial<VisitFormMeta>;
} {
  const updates: Partial<VisitFormState> = {};
  const meta: Partial<VisitFormMeta> = {};
  if (!text || !text.trim()) return { updates, meta };

  // HCP: "visit with Dr. Smith", "met with Dr. Jane Doe", "saw Dr. X"
  const hcp = extractPhrase(text, [
    /\b(?:visit\s+with|met\s+with|saw|meeting\s+with)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:with|hcp)\s+([A-Z][^.?!\n]{2,40}?)(?:\.|$|\n)/g,
  ]);
  if (hcp) {
    updates.hcpName = hcp.value;
    meta.hcpNameUpdatedFrom = hcp.source;
  }

  // Objective: "objective is to ...", "goal was to ..."
  const obj = extractPhrase(text, [
    /\b(?:objective|goal)\s+(?:is|was)\s+(?:to\s+)?([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:discussed|talked\s+about)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
  ]);
  if (obj) {
    updates.visitObjective = obj.value;
    meta.visitObjectiveUpdatedFrom = obj.source;
  }

  // Product: "product discussed was X", "discussed Toujeo"
  const prod = extractPhrase(text, [
    /\b(?:product|drug)\s+(?:discussed|was)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:discussed|about)\s+([A-Za-z][^.?!\n]{2,50}?)(?:\.|$|\n)/g,
  ]);
  if (prod) {
    updates.productDiscussed = prod.value;
    meta.productDiscussedUpdatedFrom = prod.source;
  }

  // Key questions: "asked about ..."
  const asked = extractPhrase(text, [/\b(?:asked\s+about|questions?\s+about)\s+([^.?!\n]+?)(?:\.|$|\n)/gi]);
  if (asked) {
    updates.keyQuestionsAsked = asked.value;
    meta.keyQuestionsAskedUpdatedFrom = asked.source;
  }

  // Objections: "concern is ...", "objection was ..."
  const objMatch = extractPhrase(text, [
    /\b(?:concern|objection)\s+(?:is|was)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:they\s+said|raised)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
  ]);
  if (objMatch) {
    updates.objections = objMatch.value;
    meta.objectionsUpdatedFrom = objMatch.source;
  }

  // Next steps: "next step is ...", "follow up ..."
  const next = extractPhrase(text, [
    /\bnext\s+step[s]?\s+(?:is\s+)?([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:follow\s*up|followup)\s+(?:in\s+)?([^.?!\n]+?)(?:\.|$|\n)/gi,
  ]);
  if (next) {
    updates.nextSteps = next.value;
    meta.nextStepsUpdatedFrom = next.source;
  }

  // Follow-up date: "follow up in two weeks", "follow up on Friday"
  const follow = extractPhrase(text, [
    /\b(?:follow\s*up|followup)\s+(?:in\s+)?(\d+\s*(?:weeks?|days?|months?)|\w+\s+weeks?|next\s+week|on\s+[A-Za-z]+)(?:\.|$|\n)/gi,
    /\b(?:follow\s*up\s+date|next\s+visit)\s*[:\s]*([^.?!\n]+?)(?:\.|$|\n)/gi,
  ]);
  if (follow) {
    updates.followUpDate = follow.value;
    meta.followUpDateUpdatedFrom = follow.source;
  }

  // Samples / materials
  const samples = extractPhrase(text, [
    /\b(?:samples?|materials?)\s*(?:and\s+materials?)?\s*[:\s]*([^.?!\n]+?)(?:\.|$|\n)/gi,
    /\b(?:left|provided)\s+([^.?!\n]+?)(?:\.|$|\n)/gi,
  ]);
  if (samples) {
    updates.samplesMaterials = samples.value;
    meta.samplesMaterialsUpdatedFrom = samples.source;
  }

  return { updates, meta };
}

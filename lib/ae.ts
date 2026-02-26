const TRIGGERS = [
  "hives",
  "rash",
  "urticaria",
  "anaphylaxis",
  "reaction",
  "allergic",
  "emergency",
  "er",
  "hospital",
  "hospitalized",
  "adverse event",
  "ae",
  "side effect",
  "serious",
] as const;

const NEGATIONS = [
  "no",
  "denies",
  "without",
  "none",
  "not",
  "negative for",
  "tolerating well",
  "no new",
] as const;

const GLOBAL_NEGATIVE_PHRASES = ["no side effects", "no adverse events"];

export function detectAe(text: string): boolean {
  const lower = text.toLowerCase();

  // Global negative phrases short-circuit
  if (GLOBAL_NEGATIVE_PHRASES.some((p) => lower.includes(p))) {
    return false;
  }

  const tokens = lower.split(/\s+/).filter(Boolean);

  const hasNegationNear = (triggerIndex: number): boolean => {
    const start = Math.max(0, triggerIndex - 3);
    const windowTokens = tokens.slice(start, triggerIndex + 1).join(" ");
    if (NEGATIONS.some((n) => windowTokens.includes(n))) {
      return true;
    }
    return false;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    for (const trig of TRIGGERS) {
      if (!token.includes(trig)) continue;

      // Special handling for "side effect(s)" with nearby "no"
      if (trig === "side effect") {
        if (hasNegationNear(i)) {
          continue;
        }
      }

      if (hasNegationNear(i)) {
        continue;
      }

      return true;
    }
  }

  return false;
}

// Simple embedded examples for manual verification
export const AE_EXAMPLES: { text: string; expected: boolean }[] = [
  { text: "No new side effects reported", expected: false },
  { text: "The person had hives and went to the ER for evaluation", expected: true },
  { text: "No adverse events", expected: false },
  { text: "They went to emergency after the reaction", expected: true },
];


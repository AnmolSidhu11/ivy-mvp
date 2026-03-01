import type { OrchestratorContext } from "../types";
import type { ComplianceCheckOutput } from "../types";

const PHI_MARKERS = ["patient", "dob", "date of birth", "mrn", "ssn", "medical record"];
const OFF_LABEL_LIKE = ["off-label", "unapproved use", "prescribe for", "indication not approved"];

function checkText(text: string): { warnings: string[]; blocked: boolean } {
  const lower = text.toLowerCase();
  const warnings: string[] = [];
  let blocked = false;
  for (const m of PHI_MARKERS) {
    if (lower.includes(m)) {
      warnings.push(`Possible PHI detected: "${m}". Remove patient identifiers.`);
      blocked = true;
    }
  }
  for (const m of OFF_LABEL_LIKE) {
    if (lower.includes(m)) {
      warnings.push(`Content may reference off-label: "${m}". Use only approved claims.`);
    }
  }
  return { warnings, blocked };
}

export interface ComplianceResult {
  output: ComplianceCheckOutput;
  warnings: string[];
  blocked?: boolean;
}

/** Checks inputs and optional output text for PHI and off-label-like keywords. */
export function run(context: OrchestratorContext, inputText?: string, outputText?: string): ComplianceResult {
  const allText = [inputText ?? "", outputText ?? ""].join(" ");
  const { warnings, blocked } = checkText(allText);
  const output: ComplianceCheckOutput = { warnings, blocked };
  return { output, warnings, blocked };
}

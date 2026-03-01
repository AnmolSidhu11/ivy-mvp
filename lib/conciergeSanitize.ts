const PHI_MARKERS = [
  "patient",
  "dob",
  "date of birth",
  "mrn",
  "ssn",
  "social security",
  "patient name",
  "phi",
  "medical record number",
  "patient identifier",
];

export function sanitizeText(input: string): string {
  let text = input;
  // Strip long digit sequences (likely identifiers)
  text = text.replace(/\d{8,}/g, "[redacted]");
  // Strip emails
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
  return text;
}

export function checkForPhi(input: string): string | null {
  const lower = input.toLowerCase();
  if (PHI_MARKERS.some((m) => lower.includes(m))) {
    return "Content appears to include patient identifiers (e.g., patient, DOB, MRN, SSN). Please remove PHI and try again.";
  }
  return null;
}


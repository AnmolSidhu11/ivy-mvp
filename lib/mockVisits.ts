export type ConfidenceLevel = "low" | "med" | "high";
export type VisitStatus = "draft" | "completed" | "processing";

export interface VisitSummary {
  id: string;
  hcpName: string;
  date: string;
  channel: string;
  summary: string;
  products: string[];
  keyPoints: string[];
  objections: string[];
  nextActions: string[];
  status: VisitStatus;
  /** Quality: required fields present (for checklist) */
  requiredFieldsPresent: boolean[];
  /** Quality: labels for each checklist item */
  requiredFieldLabels: string[];
  hallucinationRisk: boolean;
  confidence: {
    summary: ConfidenceLevel;
    keyPoints: ConfidenceLevel;
    objections: ConfidenceLevel;
    nextActions: ConfidenceLevel;
  };
}

const REQUIRED_FIELD_LABELS = [
  "HCP and date captured",
  "Products discussed listed",
  "Key points documented",
  "Next actions recorded",
  "No patient identifiers",
];

function visit(
  id: string,
  hcpName: string,
  date: string,
  channel: string,
  summary: string,
  products: string[],
  keyPoints: string[],
  objections: string[],
  nextActions: string[],
  status: VisitStatus,
  checklist: boolean[],
  hallucinationRisk: boolean,
  confidence: VisitSummary["confidence"]
): VisitSummary {
  return {
    id,
    hcpName,
    date,
    channel,
    summary,
    products,
    keyPoints,
    objections,
    nextActions,
    status,
    requiredFieldsPresent: checklist,
    requiredFieldLabels: REQUIRED_FIELD_LABELS,
    hallucinationRisk,
    confidence,
  };
}

export const MOCK_VISITS: VisitSummary[] = [
  visit(
    "v1",
    "Dr. Patel",
    "2026-02-25",
    "In-person",
    "Discussed Dupixent coverage workflow with clinic staff; aligned on using the coverage checklist and routing complex cases to access support.",
    ["Dupixent"],
    [
      "Coverage checklist to be printed for front-desk binder.",
      "Staff comfortable with current dosing reminders; no new materials requested.",
    ],
    ["Cost concerns for uninsured patients"],
    [
      "Email coverage checklist PDF to Maya by end of day.",
      "Schedule brief virtual touchpoint in 3–4 weeks to review progress.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "high", objections: "med", nextActions: "high" }
  ),
  visit(
    "v2",
    "Dr. Chen",
    "2026-02-24",
    "Virtual",
    "Reviewed ALTUVIIIO initiation logistics; reinforced that medical information handles specific dosing questions and shared approved dosing guide reference.",
    ["ALTUVIIIO"],
    [
      "Clinic will centralize infusion chair scheduling in a shared calendar.",
      "Team requested quick checklist for day‑of‑infusion steps.",
    ],
    [],
    [
      "Share link to approved dosing guide via secure email.",
      "Send one‑pager on infusion workflow once available.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "med", objections: "high", nextActions: "high" }
  ),
  visit(
    "v3",
    "Dr. Alvarez",
    "2026-02-20",
    "Phone",
    "Quick follow‑up call to confirm Beyfortus workflow; aligned on charting language and documentation fields to minimize rework.",
    ["Beyfortus"],
    [
      "Clinic will add a standard phrase to charting templates.",
      "Nurses comfortable with storage; no cold‑chain issues reported.",
    ],
    ["Timeline for RSV season unclear"],
    [
      "Send charting language example approved by Medical/Legal.",
      "Offer brief team in‑service if new staff join.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "med", keyPoints: "high", objections: "low", nextActions: "high" }
  ),
  visit(
    "v4",
    "Dr. Kim",
    "2026-02-19",
    "In-person",
    "Toujeo and Lantus comparison; HCP interested in switching eligible patients to Toujeo for flatter profile. Discussed titration and support materials.",
    ["Toujeo", "Lantus"],
    [
      "Will trial Toujeo in 5–10 patients over next quarter.",
      "Requested slide deck for staff education.",
    ],
    ["Rebate and formulary access vary by plan"],
    [
      "Send Toujeo titration one-pager and staff deck.",
      "Follow up in 4 weeks on trial progress.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "high", objections: "med", nextActions: "high" }
  ),
  visit(
    "v5",
    "Dr. Walsh",
    "2026-02-18",
    "Virtual",
    "Aubagio safety and monitoring; reinforced need for baseline and annual labs. HCP asked about switching from another DMT.",
    ["Aubagio"],
    [
      "Clinic already uses standard DMT monitoring template.",
      "Switching protocol reviewed; will consider case-by-case.",
    ],
    ["Patient reluctance to regular blood draws"],
    [
      "Email approved switching guide.",
      "Schedule in-service if new prescribers join.",
    ],
    "completed",
    [true, true, true, true, true],
    true,
    { summary: "med", keyPoints: "med", objections: "high", nextActions: "med" }
  ),
  visit(
    "v6",
    "Dr. Rivera",
    "2026-02-17",
    "In-person",
    "Dupixent and eczema pathway; discussed pediatric dosing and administration. Front desk will use checklist for PA submissions.",
    ["Dupixent"],
    [
      "Pediatric dosing card requested for exam rooms.",
      "PA checklist to be shared with billing team.",
    ],
    [],
    [
      "Send pediatric dosing card and PA checklist.",
      "Check in after 2 weeks on PA outcomes.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "high", objections: "high", nextActions: "high" }
  ),
  visit(
    "v7",
    "Dr. O'Brien",
    "2026-02-14",
    "Phone",
    "Libtayo first-line discussion in eligible NSCLC; HCP wanted clarity on testing and PD-L1 thresholds. No commitment to protocol change yet.",
    ["Libtayo"],
    [
      "Will review testing workflow with pathologist.",
      "Interested in real-world data when available.",
    ],
    ["Reimbursement and prior auth burden"],
    [
      "Send PD-L1 testing and Libtayo indication summary.",
      "Follow up in 6 weeks.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "med", objections: "med", nextActions: "high" }
  ),
  visit(
    "v8",
    "Dr. Nakamura",
    "2026-02-13",
    "Virtual",
    "Praluent and LDL-C goals; discussed combination with statins and PCSK9 sequencing. HCP satisfied with current outcomes.",
    ["Praluent"],
    [
      "No new starts planned this month.",
      "Will consider Praluent for next statin-intolerant patient.",
    ],
    ["Prior auth delays"],
    [
      "Leave sample stock; no formal follow-up scheduled.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "high", objections: "high", nextActions: "high" }
  ),
  visit(
    "v9",
    "Dr. Foster",
    "2026-02-12",
    "In-person",
    "Kevzara and RA; discussed MTX combination and dose escalation. HCP asked about biosimilar landscape.",
    ["Kevzara"],
    [
      "Two new starts planned this quarter.",
      "Biosimilar discussion deferred to next visit.",
    ],
    ["Patient preference for oral options"],
    [
      "Send Kevzara + MTX data summary.",
      "Schedule 30-day follow-up for new starts.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "med", keyPoints: "high", objections: "med", nextActions: "high" }
  ),
  visit(
    "v10",
    "Dr. Gupta",
    "2026-02-11",
    "Virtual",
    "MenQuadfi and adolescent immunization; clinic updating standing orders. Discussed storage and multi-dose vial use.",
    ["MenQuadfi"],
    [
      "Standing order update in progress.",
      "Nurses trained on reconstitution and storage.",
    ],
    [],
    [
      "Email updated standing order template when approved.",
      "Optional nurse refresher in 2 months.",
    ],
    "completed",
    [true, true, true, true, true],
    false,
    { summary: "high", keyPoints: "high", objections: "high", nextActions: "med" }
  ),
];

/** Last 10 visits for History table (deterministic order, most recent first) */
export function getLast10Visits(): VisitSummary[] {
  return [...MOCK_VISITS].slice(0, 10);
}

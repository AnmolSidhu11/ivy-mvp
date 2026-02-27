import type { Event, Hcp } from "./types";

export const MOCK_HCPS: Hcp[] = [
  {
    id: "hcp_2001",
    name: "Dr. Patel",
    specialty: "Dermatology",
    clinic: "Patel Dermatology",
    preferredContact: {
      name: "Maya",
      role: "Receptionist",
      email: "maya@placeholder-clinic.com",
    },
    openLoops: ["Coverage/PA rejections; send checklist to Maya"],
    productsDiscussed: ["Dupixent"],
  },
  {
    id: "hcp_2002",
    name: "Dr. Chen",
    specialty: "Hematology",
    clinic: "Chen Hematology",
    preferredContact: {
      name: "James",
      role: "Infusion Coordinator",
      email: "james@placeholder-clinic.com",
    },
    openLoops: ["Confirm timing and admin workflow for upcoming initiations"],
    productsDiscussed: ["ALTUVIIIO"],
  },
];

export const MOCK_EVENTS: Event[] = [
  {
    id: "event-1",
    hcpId: "hcp_2001",
    when: "Today · 10:30 AM",
    clinic: "Patel Dermatology",
  },
  {
    id: "event-2",
    hcpId: "hcp_2002",
    when: "Today · 2:00 PM",
    clinic: "Chen Hematology",
  },
];

export function getHcpById(id: string): Hcp | undefined {
  return MOCK_HCPS.find((h) => h.id === id);
}

export function getEventById(id: string): Event | undefined {
  return MOCK_EVENTS.find((e) => e.id === id);
}

// --- Dashboard / Visit summary mocks ---

export interface VisitHistoryItem {
  id: string;
  hcpName: string;
  date: string;
  channel: string;
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  accuracyChecks: string[];
}

export const MOCK_VISIT_HISTORY: VisitHistoryItem[] = [
  {
    id: "visit-1",
    hcpName: "Dr. Patel",
    date: "2026-02-25",
    channel: "In-person",
    summary:
      "Discussed Dupixent coverage workflow with clinic staff; aligned on using the coverage checklist and routing complex cases to access support.",
    keyPoints: [
      "Coverage checklist to be printed for front-desk binder.",
      "Staff comfortable with current dosing reminders; no new materials requested.",
    ],
    nextSteps: [
      "Email coverage checklist PDF to Maya by end of day.",
      "Schedule brief virtual touchpoint in 3–4 weeks to review progress.",
    ],
    accuracyChecks: [
      "Only approved coverage claims referenced.",
      "Fair balance mentioned when discussing potential benefits.",
      "No patient identifiers captured in notes.",
    ],
  },
  {
    id: "visit-2",
    hcpName: "Dr. Chen",
    date: "2026-02-24",
    channel: "Virtual",
    summary:
      "Reviewed ALTUVIIIO initiation logistics; reinforced that medical information handles specific dosing questions and shared approved dosing guide reference.",
    keyPoints: [
      "Clinic will centralize infusion chair scheduling in a shared calendar.",
      "Team requested quick checklist for day‑of‑infusion steps.",
    ],
    nextSteps: [
      "Share link to approved dosing guide via secure email.",
      "Send one‑pager on infusion workflow once available.",
    ],
    accuracyChecks: [
      "All dosing questions redirected to Medical Information.",
      "Discussion limited to approved indications and logistics.",
    ],
  },
  {
    id: "visit-3",
    hcpName: "Dr. Alvarez",
    date: "2026-02-20",
    channel: "Phone",
    summary:
      "Quick follow‑up call to confirm Beyfortus workflow; aligned on charting language and documentation fields to minimize rework.",
    keyPoints: [
      "Clinic will add a standard phrase to charting templates.",
      "Nurses comfortable with storage; no cold‑chain issues reported.",
    ],
    nextSteps: [
      "Send charting language example approved by Medical/Legal.",
      "Offer brief team in‑service if new staff join.",
    ],
    accuracyChecks: [
      "No off‑label scenarios were discussed.",
      "Reminded team to use approved materials stored in their intranet folder.",
    ],
  },
];



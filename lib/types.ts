export type DraftFieldKey =
  | "channel"
  | "call_objective"
  | "products_discussed"
  | "notes_summary";

export type Channel = "in_person" | "virtual" | "phone" | "email";

export type CallObjective =
  | "education"
  | "access_support"
  | "follow_up"
  | "formulary_update"
  | "other";

export interface HcpContact {
  name: string;
  role: string;
  email: string;
}

export interface Hcp {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  preferredContact: HcpContact;
  openLoops: string[];
  productsDiscussed: string[];
}

export interface Event {
  id: string;
  hcpId: string;
  when: string;
  clinic: string;
}

export interface CallDraft {
  id: string;
  eventId: string;
  hcpId: string | null;
  userId: string | null;
  transcript: string;
  channel: Channel | "";
  call_objective: CallObjective | "";
  products_discussed: string[];
  notes_summary: string;
  createdAt: string;
  safety?: SafetyCaseDraft | null;
}

export interface RequiredFieldStatus {
  key: DraftFieldKey;
  label: string;
  complete: boolean;
}

export type SafetyFieldKey =
  | "reporter_contact"
  | "suspect_product"
  | "event_onset_date"
  | "seriousness"
  | "outcome"
  | "medical_intervention";

export interface SafetyCaseDraft {
  reporter_contact: string;
  suspect_product: string;
  event_onset_date: string;
  seriousness: "serious" | "non_serious" | "unknown" | "";
  outcome: "recovered" | "recovering" | "not_recovered" | "unknown" | "";
  medical_intervention: "er_visit" | "hospitalization" | "none" | "unknown" | "";
}


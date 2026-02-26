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


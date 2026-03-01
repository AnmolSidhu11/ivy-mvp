/**
 * Deterministic demo dataset for Concierge (no Snowflake, no external deps).
 * Products: Dupixent, Beyfortus, ALTUVIIIO. 20 HCPs. Jan–May 2026, no weekends, Ontario holidays excluded.
 */

export interface DemoProduct {
  id: string;
  name: string;
  focus: string;
}

export interface DemoHcp {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  city: string;
}

export interface DemoHoliday {
  date: string;
  name: string;
}

export interface DemoVisit {
  id: string;
  date: string;
  time: string;
  status: "Completed" | "Tentative";
  hcpId: string;
  products: string[];
  location: string;
  notesStatus?: string;
}

export interface DemoNote {
  id: string;
  date: string;
  title: string;
  body: string;
  visitId: string;
  hcpId: string;
}

export interface DemoExpense {
  id: string;
  visitId: string;
  date: string;
  status: "Draft" | "Submitted" | "In Review" | "Approved" | "Rejected";
  category: string;
  merchant: string;
  amount: number;
  currency: string;
  receipt?: boolean;
  policy?: boolean;
  rejectionReason?: string;
}

/** Ontario 2026 holidays to avoid for visit dates */
export const holidays: DemoHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-16", name: "Family Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-18", name: "Victoria Day" },
];

export const products: DemoProduct[] = [
  { id: "DUP", name: "Dupixent", focus: "Atopic dermatitis, asthma" },
  { id: "BEY", name: "Beyfortus", focus: "RSV prevention" },
  { id: "ALT", name: "ALTUVIIIO", focus: "Hemophilia A" },
];

const HCP_LIST: Omit<DemoHcp, "id">[] = [
  { name: "Dr. Sarah Chen", specialty: "Dermatology", clinic: "Toronto Dermatology Centre", city: "Toronto" },
  { name: "Dr. Michael Patel", specialty: "Pediatrics", clinic: "Maple Kids Health", city: "Mississauga" },
  { name: "Dr. Emily Wong", specialty: "Hematology", clinic: "Ontario Blood Disorders", city: "Toronto" },
  { name: "Dr. James O'Brien", specialty: "Internal Medicine", clinic: "Downtown Medical", city: "Toronto" },
  { name: "Dr. Lisa Kim", specialty: "Dermatology", clinic: "Yorkville Skin Clinic", city: "Toronto" },
  { name: "Dr. David Nguyen", specialty: "Pediatrics", clinic: "Scarborough Family Pediatrics", city: "Scarborough" },
  { name: "Dr. Anna Kowalski", specialty: "Hematology", clinic: "Hamilton Hematology", city: "Hamilton" },
  { name: "Dr. Robert Singh", specialty: "Allergy & Immunology", clinic: "Brampton Allergy Centre", city: "Brampton" },
  { name: "Dr. Maria Garcia", specialty: "Dermatology", clinic: "Ottawa Skin Care", city: "Ottawa" },
  { name: "Dr. Thomas Brown", specialty: "Pediatrics", clinic: "London Children's Clinic", city: "London" },
  { name: "Dr. Jennifer Lee", specialty: "Hematology", clinic: "Toronto Hemophilia Program", city: "Toronto" },
  { name: "Dr. Christopher Adams", specialty: "Internal Medicine", clinic: "Kingston General Associates", city: "Kingston" },
  { name: "Dr. Amanda Foster", specialty: "Dermatology", clinic: "Niagara Dermatology", city: "St. Catharines" },
  { name: "Dr. Daniel Wright", specialty: "Pediatrics", clinic: "Cambridge Pediatrics", city: "Cambridge" },
  { name: "Dr. Rachel Moore", specialty: "Hematology", clinic: "Windsor Blood Clinic", city: "Windsor" },
  { name: "Dr. Kevin Zhang", specialty: "Allergy & Immunology", clinic: "Markham Allergy Institute", city: "Markham" },
  { name: "Dr. Stephanie Clark", specialty: "Dermatology", clinic: "Burlington Skin Health", city: "Burlington" },
  { name: "Dr. Matthew Wilson", specialty: "Pediatrics", clinic: "Oakville Pediatric Group", city: "Oakville" },
  { name: "Dr. Nicole Taylor", specialty: "Hematology", clinic: "Sudbury Hematology", city: "Sudbury" },
  { name: "Dr. Andrew Martin", specialty: "Internal Medicine", clinic: "Thunder Bay Medical", city: "Thunder Bay" },
];

export const hcps: DemoHcp[] = HCP_LIST.map((h, i) => ({
  ...h,
  id: `HCP-${String(i + 1).padStart(3, "0")}`,
}));

const HOLIDAY_SET = new Set(holidays.map((h) => h.date));

function isWeekday(ymd: string): boolean {
  const d = new Date(ymd + "T12:00:00");
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function weekdaysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  while (cur <= endDate) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    const ymd = `${y}-${m}-${day}`;
    if (isWeekday(ymd) && !HOLIDAY_SET.has(ymd)) out.push(ymd);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const PAST_DATES = weekdaysInRange("2026-01-02", "2026-02-28");
const FUTURE_DATES = weekdaysInRange("2026-03-01", "2026-05-29");

const PRODUCT_IDS = products.map((p) => p.name);

/** Jan–Feb 2026 completed visits (deterministic order) */
export const visitsPast: DemoVisit[] = PAST_DATES.slice(0, 24).map((date, i) => {
  const hcp = hcps[i % hcps.length]!;
  const mmdd = date.slice(5).replace("-", "");
  return {
    id: `VIS-2026-${mmdd}-01`,
    date,
    time: i % 3 === 0 ? "09:00" : i % 3 === 1 ? "11:00" : "14:00",
    status: "Completed",
    hcpId: hcp.id,
    products: [PRODUCT_IDS[i % 3]!],
    location: hcp.clinic,
    notesStatus: i % 2 === 0 ? "Captured" : undefined,
  };
});

/** Mar–May 2026 tentative visits */
export const visitsFuture: DemoVisit[] = FUTURE_DATES.slice(0, 28).map((date, i) => {
  const hcp = hcps[(i + 5) % hcps.length]!;
  const mmdd = date.slice(5).replace("-", "");
  return {
    id: `VIS-2026-${mmdd}-01`,
    date,
    time: i % 3 === 0 ? "10:00" : i % 3 === 1 ? "13:00" : "15:00",
    status: "Tentative",
    hcpId: hcp.id,
    products: [PRODUCT_IDS[i % 3]!],
    location: hcp.clinic,
  };
});

export const notes: DemoNote[] = [
  { id: "NOTE-001", date: "2026-01-06", title: "Pre-call prep", body: "Review Dupixent dosing and coverage checklist.", visitId: visitsPast[0]!.id, hcpId: visitsPast[0]!.hcpId },
  { id: "NOTE-002", date: "2026-01-14", title: "Visit debrief", body: "HCP interested in Beyfortus for next season.", visitId: visitsPast[4]!.id, hcpId: visitsPast[4]!.hcpId },
  { id: "NOTE-003", date: "2026-02-03", title: "Follow-up", body: "Send ALTUVIIIO one-pager and schedule callback.", visitId: visitsPast[12]!.id, hcpId: visitsPast[12]!.hcpId },
  { id: "NOTE-004", date: "2026-02-18", title: "General", body: "Clinic will update standing orders next month.", visitId: visitsPast[18]!.id, hcpId: visitsPast[18]!.hcpId },
];

/** Expenses up to Feb 2026, mix statuses */
export const expenses: DemoExpense[] = [
  { id: "EXP-001", visitId: visitsPast[0]!.id, date: "2026-01-06", status: "Approved", category: "Meals", merchant: "Café Ontario", amount: 45, currency: "CAD", receipt: true, policy: true },
  { id: "EXP-002", visitId: visitsPast[2]!.id, date: "2026-01-08", status: "Rejected", category: "Travel", merchant: "Ride Share", amount: 120, currency: "CAD", rejectionReason: "Receipt missing" },
  { id: "EXP-003", visitId: visitsPast[4]!.id, date: "2026-01-14", status: "Draft", category: "Meals", merchant: "Restaurant", amount: 65, currency: "CAD" },
  { id: "EXP-004", visitId: visitsPast[6]!.id, date: "2026-01-20", status: "In Review", category: "Materials", merchant: "Office Supplies", amount: 30, currency: "CAD", receipt: true },
  { id: "EXP-005", visitId: visitsPast[8]!.id, date: "2026-01-24", status: "Submitted", category: "Travel", merchant: "Parking", amount: 18, currency: "CAD" },
  { id: "EXP-006", visitId: visitsPast[10]!.id, date: "2026-02-02", status: "Approved", category: "Lodging", merchant: "Hotel", amount: 180, currency: "CAD", receipt: true, policy: true },
  { id: "EXP-007", visitId: visitsPast[14]!.id, date: "2026-02-12", status: "Draft", category: "Other", merchant: "Misc", amount: 25, currency: "CAD" },
  { id: "EXP-008", visitId: visitsPast[16]!.id, date: "2026-02-20", status: "Approved", category: "Meals", merchant: "Lunch Meeting", amount: 52, currency: "CAD", receipt: true, policy: true },
];

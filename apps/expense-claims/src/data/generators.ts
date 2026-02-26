import type { Visit, ExpenseClaim, Attendee, ReceiptInfo, ClaimFlags, PolicyResult, AuditEntry } from "../types";

const PRODUCT_NAMES = ["Product A", "Vaccines Portfolio", "Immunology Portfolio", "Rare Disease Portfolio"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateVisits(count: number): Visit[] {
  const visits: Visit[] = [];
  const locations = ["Toronto, ON", "Mississauga, ON", "Vancouver, BC", "Calgary, AB", "Montreal, QC"];
  const hcps = ["Dr. Patel", "Dr. Chen", "Dr. Walsh", "Dr. Kim", "Dr. Rivera", "Dr. Foster"];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.now() - i * 86400000 * 3);
    const hcp = hcps[i % hcps.length];
    const vid = `VIS-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(1000 + i).slice(-4)}`;
    if (used.has(vid)) continue;
    used.add(vid);
    visits.push({
      id: vid,
      date: date.toISOString().slice(0, 10),
      hcpName: hcp,
      location: pick(locations),
      productsDiscussed: PRODUCT_NAMES.slice(0, 1 + (i % 3)),
    });
  }
  return visits.sort((a, b) => b.date.localeCompare(a.date));
}

function defaultFlags(): ClaimFlags {
  return { noAlcohol: true, businessPurpose: false, policyConfirmed: false };
}

function defaultPolicy(): PolicyResult {
  return { warnings: [], blocks: [], requiresReview: false };
}

function audit(actor: string, action: string, detail?: string): AuditEntry {
  return { ts: new Date().toISOString(), actor, action, detail };
}

export function generateClaims(
  visits: Visit[],
  count: number
): ExpenseClaim[] {
  const statuses: ExpenseClaim["status"][] = ["Draft", "Submitted", "In Review", "Approved", "Rejected"];
  const categories = ["Meal", "Taxi/Rideshare", "Parking", "Hotel", "Other"];
  const merchants = ["The Keg", "Uber", "Green P Parking", "Marriott", "Local Bistro"];
  const claims: ExpenseClaim[] = [];
  for (let i = 0; i < count; i++) {
    const visit = visits[i % visits.length];
    const status = statuses[i % statuses.length];
    const created = new Date(Date.now() - (count - i) * 86400000 * 2);
    const updated = new Date(created.getTime() + 3600000);
    const claimId = id("EXP");
    const attendees: Attendee[] = [{ name: visit.hcpName, role: "HCP" }];
    if (i % 3 === 0) attendees.push({ name: "Rep Colleague", role: "Rep" });
    const category = categories[i % categories.length];
    const amount = category === "Meal" ? 45 + Math.floor(Math.random() * 40) : 20 + Math.floor(Math.random() * 80);
    const receipt: ReceiptInfo | null =
      status !== "Draft"
        ? { fileName: "receipt.pdf", mimeType: "application/pdf", size: 10240, mockUrl: "#" }
        : null;
    const policy = defaultPolicy();
    if (category === "Meal" && amount > 60) policy.warnings.push("Meal exceeds CAD 60 per person; requires review.");
    if (category === "Other") policy.requiresReview = true;
    if (!attendees.some((a) => a.role === "HCP")) policy.blocks.push("At least one HCP attendee required.");
    const auditTrail: AuditEntry[] = [audit("system", "created", "Draft")];
    if (status !== "Draft") auditTrail.push(audit("rep", "submitted"));
    if (status === "In Review" || status === "Approved" || status === "Rejected")
      auditTrail.push(audit("manager", "sent_to_review"));
    if (status === "Approved") auditTrail.push(audit("manager", "approved"));
    if (status === "Rejected") auditTrail.push(audit("manager", "rejected", "Amount over limit"));

    claims.push({
      id: claimId,
      visitId: visit.id,
      repName: "Rep User",
      category,
      merchant: merchants[i % merchants.length],
      amount,
      currency: "CAD",
      attendees,
      receipt,
      notes: i % 2 === 0 ? "Lunch during product discussion." : "",
      flags: defaultFlags(),
      status,
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
      policy,
      auditTrail,
    });
  }
  return claims.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

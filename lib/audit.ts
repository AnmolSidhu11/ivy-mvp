export type AuditAction =
  | "note_created"
  | "note_updated"
  | "claim_drafted"
  | "claim_submitted"
  | "ai_precall_generated"
  | "ai_postcall_generated"
  | "ics_generated"
  | "calendar_day_viewed";

export interface AuditEvent {
  id: string;
  tsIso: string;
  dateYmd: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  detail?: string;
}

const STORAGE_KEY = "concierge_audit";

function loadAll(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveAll(events: AuditEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

function nextAuditId(existing: AuditEvent[]): string {
  const base = "audit_";
  const now = Date.now().toString(36);
  let n = existing.length + 1;
  let id = `${base}${now}_${n}`;
  const ids = new Set(existing.map((e) => e.id));
  while (ids.has(id)) {
    n += 1;
    id = `${base}${now}_${n}`;
  }
  return id;
}

export function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  detail?: string,
): void {
  if (typeof window === "undefined") return;
  const all = loadAll();
  const tsIso = new Date().toISOString();
  const dateYmd = tsIso.slice(0, 10);
  const event: AuditEvent = {
    id: nextAuditId(all),
    tsIso,
    dateYmd,
    action,
    entityType,
    entityId,
    detail,
  };
  all.push(event);
  saveAll(all);
}

export function listAuditByDate(dateYmd: string): AuditEvent[] {
  const all = loadAll();
  return all.filter((e) => e.dateYmd === dateYmd);
}


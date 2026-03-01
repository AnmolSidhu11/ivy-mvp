/**
 * Concierge audit logger.
 * Server: module-level in-memory store. Browser: also persist to localStorage "concierge_audit".
 * GET /api/audit?date=YYYY-MM-DD uses listAuditByDate.
 */

export type AuditEvent = {
  id: string;
  tsIso: string;
  dateYmd: string;
  action: string;
  agent?: string;
  task?: string;
  entityType?: string;
  entityId?: string;
  detail?: unknown;
};

const STORAGE_KEY = "concierge_audit";
const inMemoryStore: AuditEvent[] = [];
let idCounter = 0;

/** YYYY-MM-DD in local time from an ISO timestamp string. */
function tsIsoToDateYmd(tsIso: string): string {
  const d = new Date(tsIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function nextId(dateYmd: string, action: string, input: unknown): string {
  idCounter += 1;
  const hash = simpleHash(JSON.stringify(input)).toString(16);
  return `${dateYmd}-${action}-${hash}-${idCounter}`;
}

/**
 * Log an audit event. id, tsIso, dateYmd are derived if not provided.
 * Returns the event id.
 */
export function logAudit(
  input: Omit<AuditEvent, "id" | "tsIso" | "dateYmd"> & { tsIso?: string }
): string {
  const tsIso = input.tsIso ?? new Date().toISOString();
  const dateYmd = tsIsoToDateYmd(tsIso);
  const id = nextId(dateYmd, input.action, input);
  const entry: AuditEvent = {
    id,
    tsIso,
    dateYmd,
    action: input.action,
    agent: input.agent,
    task: input.task,
    entityType: input.entityType,
    entityId: input.entityId,
    detail: input.detail,
  };
  inMemoryStore.push(entry);

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: AuditEvent[] = raw ? (JSON.parse(raw) as AuditEvent[]) : [];
      list.push(entry);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // best effort; ignore
    }
  }

  return id;
}

/**
 * Returns events from memory and (if in browser) localStorage, filtered by dateYmd, newest first.
 */
export function listAuditByDate(dateYmd: string): AuditEvent[] {
  const fromMemory = inMemoryStore.filter((e) => e.dateYmd === dateYmd);
  let fromStorage: AuditEvent[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as AuditEvent[];
        fromStorage = list.filter((e) => e.dateYmd === dateYmd);
      }
    } catch {
      // ignore
    }
  }
  const seen = new Set<string>(fromMemory.map((e) => e.id));
  for (const e of fromStorage) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      fromMemory.push(e);
    }
  }
  fromMemory.sort((a, b) => b.tsIso.localeCompare(a.tsIso));
  return fromMemory;
}

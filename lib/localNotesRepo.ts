import type { Note, NotesRepo } from "./notesRepo";

const STORAGE_KEY = "concierge_notes";

function loadAllNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveAllNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

function nextNoteId(existing: Note[]): string {
  const base = "note_";
  const now = Date.now().toString(36);
  let n = existing.length + 1;
  let id = `${base}${now}_${n}`;
  const existingIds = new Set(existing.map((n) => n.id));
  while (existingIds.has(id)) {
    n += 1;
    id = `${base}${now}_${n}`;
  }
  return id;
}

export const LocalNotesRepo: NotesRepo = {
  async listByDate(dateYmd: string): Promise<Note[]> {
    const all = loadAllNotes();
    return all.filter((n) => n.dateYmd === dateYmd);
  },

  async get(noteId: string): Promise<Note | null> {
    const all = loadAllNotes();
    return all.find((n) => n.id === noteId) ?? null;
  },

  async create(input: Omit<Note, "id" | "createdAtIso" | "updatedAtIso">): Promise<Note> {
    const all = loadAllNotes();
    const now = new Date().toISOString();
    const note: Note = {
      ...input,
      id: nextNoteId(all),
      createdAtIso: now,
      updatedAtIso: now,
    };
    all.push(note);
    saveAllNotes(all);
    return note;
  },

  async update(
    noteId: string,
    patch: Partial<Pick<Note, "title" | "body">>,
  ): Promise<Note | null> {
    const all = loadAllNotes();
    const idx = all.findIndex((n) => n.id === noteId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const updated: Note = {
      ...all[idx],
      ...patch,
      updatedAtIso: now,
    };
    all[idx] = updated;
    saveAllNotes(all);
    return updated;
  },

  async delete(noteId: string): Promise<boolean> {
    const all = loadAllNotes();
    const next = all.filter((n) => n.id !== noteId);
    if (next.length === all.length) return false;
    saveAllNotes(next);
    return true;
  },
};


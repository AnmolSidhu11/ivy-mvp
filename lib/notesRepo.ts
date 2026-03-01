/** Note as stored (Repo); alias RepNote per spec. */
export interface Note {
  id: string;
  /** ISO date-only string, e.g. 2026-02-27 */
  dateYmd: string;
  title: string;
  body: string;
  visitId?: string;
  hcpName?: string;
  /** ISO timestamp when created */
  createdAtIso: string;
  /** ISO timestamp when last updated */
  updatedAtIso: string;
}

/** Alias for spec: createdAt/updatedAt are ISO strings. */
export type RepNote = Note;

export interface NotesRepo {
  listByDate(dateYmd: string): Promise<Note[]>;
  /** Client-only: returns all notes (for month view badge counts). */
  listAll?(): Promise<Note[]>;
  get(noteId: string): Promise<Note | null>;
  create(note: Omit<Note, "id" | "createdAtIso" | "updatedAtIso">): Promise<Note>;
  update(noteId: string, patch: Partial<Pick<Note, "title" | "body">>): Promise<Note | null>;
  delete(noteId: string): Promise<boolean>;
}


"use client";

import { useEffect, useState } from "react";
import type { Note } from "@/lib/notesRepo";

type Props = {
  open: boolean;
  dateYmd: string;
  visitId?: string;
  hcpName?: string;
  initialNote?: Note | null;
  onCancel: () => void;
  onSave: (data: { title: string; body: string }) => Promise<void> | void;
};

export function QuickNoteModal({
  open,
  dateYmd,
  visitId,
  hcpName,
  initialNote,
  onCancel,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialNote?.title ?? (hcpName ? `Note · ${hcpName}` : ""));
    setBody(initialNote?.body ?? "");
  }, [open, initialNote?.title, initialNote?.body, hcpName]);

  if (!open) return null;

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || (hcpName ? `Note · ${hcpName}` : `Note · ${dateYmd}`),
        body: body.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-lg ring-1 ring-zinc-200">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Quick note</h2>
            <p className="text-xs text-zinc-500">
              {dateYmd}
              {hcpName ? ` · ${hcpName}` : ""}
              {visitId ? ` · Visit ${visitId}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="mb-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-900">
          Internal use only. Do not include patient/PHI.
        </div>

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="e.g., Follow-up reminder"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Note
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="Key context or reminders for this day..."
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>
    </>
  );
}


"use client";

import { useState } from "react";
import type { DraftFieldKey } from "@/lib/types";

interface MissingFieldsFormProps {
  draftId: string;
  missing: DraftFieldKey[];
  onSubmit: (values: Partial<Record<DraftFieldKey, string>>) => void;
}

export function MissingFieldsForm({
  missing,
  onSubmit,
  draftId: _draftId,
}: MissingFieldsFormProps) {
  const fields = missing.slice(0, 3);
  const [values, setValues] = useState<Partial<Record<DraftFieldKey, string>>>({});

  if (fields.length === 0) {
    return (
      <p className="text-sm text-emerald-700">
        All required fields look complete. You can submit this report.
      </p>
    );
  }

  const handleChange = (key: DraftFieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const labelFor = (key: DraftFieldKey): string => {
    switch (key) {
      case "channel":
        return "Channel (in_person, virtual, phone, email)";
      case "call_objective":
        return "Call objective (education, access_support, follow_up, formulary_update, other)";
      case "products_discussed":
        return "Products discussed (comma-separated)";
      case "notes_summary":
        return "1–2 sentence summary of what happened";
      default:
        return key;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
        Missing fields (showing up to 3)
      </p>
      {fields.map((key) => (
        <div key={key} className="space-y-1">
          <label className="block text-xs font-medium text-zinc-700">
            {labelFor(key)}
          </label>
          {key === "notes_summary" ? (
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              rows={3}
              value={values[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={values[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Save answers
      </button>
    </form>
  );
}


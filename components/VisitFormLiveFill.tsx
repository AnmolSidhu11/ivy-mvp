"use client";

import {
  type VisitFormState,
  type VisitFormMeta,
  type VisitFormFieldKey,
  VISIT_FORM_FIELD_LABELS,
} from "@/lib/visitCaptureForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet";
const labelClass = "mb-0.5 block text-xs font-medium text-zinc-600";
const metaClass = "mt-0.5 text-[10px] text-zinc-500 italic";

interface VisitFormLiveFillProps {
  state: VisitFormState;
  meta: VisitFormMeta;
  onChange: (updates: Partial<VisitFormState>) => void;
}

export function VisitFormLiveFill({ state, meta, onChange }: VisitFormLiveFillProps) {
  const set = (key: VisitFormFieldKey, value: string) => {
    onChange({ [key]: value });
  };

  const fields: { key: VisitFormFieldKey; rows?: number }[] = [
    { key: "hcpName" },
    { key: "visitObjective", rows: 2 },
    { key: "productDiscussed" },
    { key: "keyQuestionsAsked", rows: 2 },
    { key: "objections", rows: 2 },
    { key: "nextSteps", rows: 2 },
    { key: "samplesMaterials", rows: 1 },
    { key: "followUpDate" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Visit form (live)</CardTitle>
        <p className="text-xs text-zinc-500">
          Editable. Fills from voice or pasted transcription.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(({ key, rows }) => {
          const updatedFrom = meta[`${key}UpdatedFrom` as keyof VisitFormMeta];
          return (
            <div key={key}>
              <label className={labelClass}>{VISIT_FORM_FIELD_LABELS[key]}</label>
              {rows && rows > 1 ? (
                <textarea
                  className={inputClass}
                  rows={rows}
                  value={state[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`${VISIT_FORM_FIELD_LABELS[key]}…`}
                />
              ) : (
                <input
                  type="text"
                  className={inputClass}
                  value={state[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`${VISIT_FORM_FIELD_LABELS[key]}…`}
                />
              )}
              {updatedFrom && (
                <p className={metaClass}>Updated from: &ldquo;{updatedFrom}&rdquo;</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

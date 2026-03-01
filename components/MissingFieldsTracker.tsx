"use client";

import {
  type VisitFormState,
  type VisitFormFieldKey,
  getMissingFields,
  VISIT_FORM_FIELD_LABELS,
} from "@/lib/visitCaptureForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MissingFieldsTrackerProps {
  formState: VisitFormState;
}

export function MissingFieldsTracker({ formState }: MissingFieldsTrackerProps) {
  const missing = getMissingFields(formState);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Missing fields</CardTitle>
        <p className="text-xs text-zinc-500">Required fields still empty.</p>
      </CardHeader>
      <CardContent>
        {missing.length === 0 ? (
          <p className="text-xs text-emerald-700">All required fields are filled.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {missing.map((key: VisitFormFieldKey) => (
              <li
                key={key}
                className="flex items-center gap-2 rounded bg-amber-50 px-2 py-1 text-amber-800"
              >
                <span className="font-medium">!</span>
                {VISIT_FORM_FIELD_LABELS[key]}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

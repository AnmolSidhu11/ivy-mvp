"use client";

import {
  type VisitFormState,
  type VisitFormFieldKey,
  getMissingFields,
  VISIT_FORM_FIELD_LABELS,
} from "@/lib/visitCaptureForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AssistantFollowUpPanelProps {
  formState: VisitFormState;
  voicePrompt: string;
  onVoicePromptChange: (value: string) => void;
}

const OPTIONAL_FIELDS: VisitFormFieldKey[] = [
  "keyQuestionsAsked",
  "objections",
  "samplesMaterials",
  "followUpDate",
];

export function AssistantFollowUpPanel({
  formState,
  voicePrompt,
  onVoicePromptChange,
}: AssistantFollowUpPanelProps) {
  const missing = getMissingFields(formState);
  const optionalMissing = OPTIONAL_FIELDS.filter((k) => !formState[k]?.trim());
  const suggestions: string[] = [];

  missing.forEach((key) => {
    suggestions.push(`You didn't mention ${VISIT_FORM_FIELD_LABELS[key]}. Want to add it?`);
  });
  if (optionalMissing.length > 0 && suggestions.length < 3) {
    optionalMissing.slice(0, 3 - suggestions.length).forEach((key) => {
      suggestions.push(`Any ${VISIT_FORM_FIELD_LABELS[key].toLowerCase()}?`);
    });
  }
  const showSuggestions = suggestions.slice(0, 3);

  const insertQuestion = (text: string) => {
    const added = voicePrompt.trim() ? `${voicePrompt}\n${text}` : text;
    onVoicePromptChange(added);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Assistant follow-up</CardTitle>
        <p className="text-xs text-zinc-500">
          Suggested questions to ask next (for future agent mode). Click to add to prompt.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {showSuggestions.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {showSuggestions.map((q, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => insertQuestion(q)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left text-zinc-700 hover:bg-violet/10 hover:border-violet"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No suggestions. Form looks complete.</p>
        )}
        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-600">
            Voice follow-up prompt
          </label>
          <textarea
            className="min-h-[60px] w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
            placeholder="Paste or type follow-up questions for the rep…"
            value={voicePrompt}
            onChange={(e) => onVoicePromptChange(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

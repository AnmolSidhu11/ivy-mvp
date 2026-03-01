"use client";

import { useState, useCallback } from "react";
import { checkForPhi } from "@/lib/conciergeSanitize";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ConciergePanelVariant = "small" | "side" | "tab";

type Props = {
  variant?: ConciergePanelVariant;
  className?: string;
};

const BANNER_TEXT = "No patient/PII. Internal HCP workflow only.";

export function ConciergePanel({ variant = "side", className = "" }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const phiError = checkForPhi(trimmed);
    if (phiError) {
      setError(phiError);
      setAnswer(null);
      return;
    }
    setError(null);
    setLoading(true);
    setAnswer(null);
    setCategoryLabel(null);

    try {
      const res = await fetch("/api/concierge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setAnswer(data.answer ?? "");
      setCategoryLabel(data.categoryLabel ?? null);
      logAudit("concierge_ask", "concierge", data.category ?? "ask", trimmed.slice(0, 80));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [question]);

  const isSmall = variant === "small";

  return (
    <Card className={`rounded-2xl border-white/60 bg-white/95 shadow-sm backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-violet">Ask Concierge</CardTitle>
        <div className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-900">
          {BANNER_TEXT}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. expense policy, objection handling, CRM log..."
            rows={isSmall ? 2 : 3}
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
            disabled={loading}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="mt-1.5 bg-violet hover:bg-violet/90"
          >
            {loading ? "Asking…" : "Ask"}
          </Button>
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">{error}</p>
        )}
        {answer && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-800">
            {categoryLabel && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {categoryLabel}
              </p>
            )}
            <p className="whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

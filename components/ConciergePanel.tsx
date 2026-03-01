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

const BANNER = "No patient/PII. Internal HCP workflow only.";
const CARD_CLASS =
  "rounded-2xl border-white/60 bg-white/95 shadow-sm backdrop-blur-sm";

type ConciergeResult = {
  answer: string;
  categoryLabel: string | null;
  category: string;
};

async function askConcierge(question: string): Promise<ConciergeResult> {
  const res = await fetch("/api/concierge/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return {
    answer: data.answer ?? "",
    categoryLabel: data.categoryLabel ?? null,
    category: data.category ?? "ask",
  };
}

export function ConciergePanel({ variant = "side", className = "" }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ConciergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const phiError = checkForPhi(trimmed);
    if (phiError) {
      setError(phiError);
      setResult(null);
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await askConcierge(trimmed);
      setResult(data);
      logAudit("concierge_ask", "concierge", data.category, trimmed.slice(0, 80));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [question]);

  const isSmall = variant === "small";

  return (
    <Card className={`${CARD_CLASS} ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-violet">Ask Concierge</CardTitle>
        <div className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-900">
          {BANNER}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. expense policy, objection handling, CRM log..."
            rows={isSmall ? 2 : 3}
            disabled={loading}
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
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
        {result && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-800">
            {result.categoryLabel && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {result.categoryLabel}
              </p>
            )}
            <p className="whitespace-pre-wrap">{result.answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

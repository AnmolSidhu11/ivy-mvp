"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadAllClaims } from "@/lib/conciergeAgenda";
import { useVisitsStore } from "@/lib/store";

const STATUS_VARIANTS: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-800",
  Submitted: "bg-blue-100 text-blue-800",
  "In Review": "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function ExpenseHistoryPage() {
  const router = useRouter();
  const { visits } = useVisitsStore();
  const [claims, setClaims] = useState<ReturnType<typeof loadAllClaims>>([]);

  useEffect(() => {
    const next = loadAllClaims();
    queueMicrotask(() => setClaims(next));
  }, []);

  const sorted = useMemo(() => {
    return [...claims].sort((a, b) => b.dateYmd.localeCompare(a.dateYmd) || b.updatedAtIso.localeCompare(a.updatedAtIso));
  }, [claims]);

  const getHcpForVisit = (visitId: string | undefined) => {
    if (!visitId) return "—";
    const v = visits.find((x) => x.id === visitId);
    return v?.hcpName ?? visitId;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-lavender via-white to-violet/20 p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Expense history
            </h1>
            <p className="text-sm text-slate-600">
              All claims sorted by date. Open a claim or submit a new expense.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
            <Link href="/expense/submit">
              <Button size="sm" className="bg-violet hover:bg-violet/90">
                Submit new expense
              </Button>
            </Link>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">No expenses submitted.</p>
            <p className="mt-1 text-xs text-slate-500">
              Submit a new expense to see it here.
            </p>
            <Link href="/expense/submit">
              <Button className="mt-4">Submit new expense</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-slate-900">{c.dateYmd}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_VARIANTS[c.status] ?? "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-sm text-slate-600">
                    {c.visitId ? (
                      <Link href={`/visit/${c.visitId}`} className="text-violet hover:underline">
                        {getHcpForVisit(c.visitId)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <Link href={`/claim/${encodeURIComponent(c.id)}`}>
                  <Button variant="outline" size="sm">
                    View claim
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

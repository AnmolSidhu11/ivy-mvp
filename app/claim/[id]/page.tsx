"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClaimRow = {
  id?: string;
  visitId?: string;
  status?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

function loadClaim(claimId: string): ClaimRow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("expense-demo:claims");
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return null;
    const found = arr.find((c) => c && typeof c === "object" && (c as ClaimRow).id === claimId);
    return found ? (found as ClaimRow) : null;
  } catch {
    return null;
  }
}

export default function ClaimDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [claim, setClaim] = useState<ClaimRow | null>(null);

  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => setClaim(loadClaim(id)), 0);
    return () => clearTimeout(t);
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet p-6 font-sans">
        <p className="text-zinc-600">Missing claim ID.</p>
        <Link href="/calendar">
          <Button variant="outline" className="mt-4">
            Back to Calendar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto max-w-2xl px-6 py-10 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-violet">Claim detail</h1>
          <Link href="/calendar">
            <Button variant="outline" size="sm">
              Back to Calendar
            </Button>
          </Link>
        </div>

        {!claim ? (
          <Card className="rounded-2xl border-zinc-100 bg-white/95 p-6 shadow-sm">
            <p className="text-sm text-zinc-600">
              Claim <span className="font-mono">{id}</span> not found or not loaded yet.
            </p>
            <Link href="/expense">
              <Button variant="outline" className="mt-4">
                Submit expense
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="rounded-2xl border-zinc-100 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-mono">{claim.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700">
              <p>
                <span className="font-medium text-zinc-800">Status:</span>{" "}
                {claim.status ?? "Unknown"}
              </p>
              {claim.visitId && (
                <p>
                  <span className="font-medium text-zinc-800">Visit:</span> {claim.visitId}
                </p>
              )}
              {claim.updatedAt && (
                <p>
                  <span className="font-medium text-zinc-800">Updated:</span>{" "}
                  {claim.updatedAt.slice(0, 19)}
                </p>
              )}
            </CardContent>
            <div className="border-t border-zinc-100 px-6 py-4">
              <Link href="/expense">
                <Button variant="outline" size="sm">
                  Edit / Submit expense
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

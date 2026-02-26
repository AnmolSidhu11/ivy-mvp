"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  backHref?: string;
  children: ReactNode;
}

export function AppShell({ title, backHref, children }: AppShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 font-sans text-zinc-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          {backHref ? (
            <button
              type="button"
              onClick={() => (backHref === "back" ? router.back() : router.push(backHref))}
              className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              ← Back
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Dashboard
            </Link>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </header>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}


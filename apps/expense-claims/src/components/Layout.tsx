import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

export function Layout({
  children,
  storageMode,
  onToggleStorage,
  onOpenADLSConfig,
}: {
  children: React.ReactNode;
  storageMode: "Local" | "ADLS";
  onToggleStorage: () => void;
  onOpenADLSConfig: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-white to-violet/20 font-sans text-slate-900">
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold text-violet">
            Visit Expense Claims
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Storage:</span>
            <button
              type="button"
              onClick={onToggleStorage}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                storageMode === "ADLS"
                  ? "bg-violet text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {storageMode}
            </button>
            {storageMode === "ADLS" && (
              <button
                type="button"
                onClick={onOpenADLSConfig}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                ADLS Config
              </button>
            )}
            <Link
              to="/new"
              className="rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-hover"
            >
              New Claim
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

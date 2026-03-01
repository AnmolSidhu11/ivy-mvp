"use client";

import { useEffect } from "react";
import { DEMO_MODE } from "@/lib/env";
import { resetDemoData } from "@/lib/demoSeed";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDrawer({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!DEMO_MODE) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          aria-hidden
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] transform rounded-l-2xl border-l border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-labelledby="settings-drawer-title"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h2 id="settings-drawer-title" className="text-lg font-semibold text-zinc-900">
              Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Close"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Demo
            </h3>
            <p className="mb-3 text-sm text-zinc-600">
              Clear all demo visits, notes, and expenses, then reload. Data will be reseeded on next load.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-800 hover:bg-amber-50"
              onClick={() => {
                resetDemoData();
              }}
            >
              Reset demo data
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}

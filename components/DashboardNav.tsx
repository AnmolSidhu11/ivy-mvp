"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_MODE } from "@/lib/env";
import { SettingsDrawer } from "@/components/SettingsDrawer";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/new-visit", label: "New Visit" },
  { href: "/expense", label: "Expense" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const current = pathname ?? "";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-sm backdrop-blur-sm md:flex">
        <div className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Navigation
        </div>
        <nav className="space-y-1.5 text-sm">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              current === href || (href !== "/dashboard" && current.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={
                  isActive
                    ? "flex items-center justify-between rounded-xl bg-violet/10 px-3 py-2.5 text-xs font-medium text-violet hover:bg-violet/15 transition-colors"
                    : "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-lavender/50 hover:text-violet transition-colors"
                }
              >
                <span>{label}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-violet" />}
              </Link>
            );
          })}
          {DEMO_MODE && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            >
              Settings
            </button>
          )}
        </nav>
      </aside>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

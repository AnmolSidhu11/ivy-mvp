"use client";

import { useState } from "react";
import { buildIcsWorkflow, type IcsWorkflowOption } from "@/lib/calendarIcsWorkflow";
import { buildIcsCalendar, downloadIcs } from "@/lib/calendarIcs";

const OPTIONS: { value: IcsWorkflowOption; label: string }[] = [
  { value: "full", label: "Full workflow (Pre-call + Visit + Post-call + Expense)" },
  { value: "precall", label: "Pre-call" },
  { value: "visit", label: "Visit" },
  { value: "postcall", label: "Post-call" },
  { value: "expense", label: "Expense reminder" },
];

type Props = {
  visitId: string;
  hcpName: string;
  dateYmd: string;
  onDownload: () => void;
};

export function AddToCalendarDropdown({ visitId, hcpName, dateYmd, onDownload }: Props) {
  const [open, setOpen] = useState(false);

  const visitDate = dateYmd ? new Date(dateYmd + "T00:00:00") : undefined;
  const params = {
    visitId,
    hcpName,
    visitDate,
  };

  const handleOption = (option: IcsWorkflowOption) => {
    setOpen(false);
    const { events, filename } = buildIcsWorkflow(params, option, visitId);
    if (events.length === 0) return;
    const ics = buildIcsCalendar(events);
    downloadIcs(ics, filename);
    onDownload();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-50"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Add to calendar
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            {OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => handleOption(value)}
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-800 hover:bg-zinc-50"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

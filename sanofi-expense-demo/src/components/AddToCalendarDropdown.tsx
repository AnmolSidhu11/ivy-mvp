import { useState } from "react";
import { buildIcsCalendar, downloadIcs } from "../utils/calendarIcs";
import {
  buildIcsWorkflow,
  type IcsWorkflowOption,
  type IcsWorkflowParams,
} from "../utils/calendarIcsWorkflow";
import "./AddToCalendarDropdown.css";

type AddToCalendarDropdownProps = {
  params: IcsWorkflowParams;
  entityIdForFilename: string;
  onDownload: () => void;
};

const OPTIONS: { value: IcsWorkflowOption; label: string }[] = [
  { value: "full", label: "Full workflow (Pre-call + Visit + Post-call + Expense)" },
  { value: "precall", label: "Pre-call" },
  { value: "visit", label: "Visit" },
  { value: "postcall", label: "Post-call" },
  { value: "expense", label: "Expense reminder" },
];

export function AddToCalendarDropdown({
  params,
  entityIdForFilename,
  onDownload,
}: AddToCalendarDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleOption = (option: IcsWorkflowOption) => {
    setOpen(false);
    const { events, filename } = buildIcsWorkflow(params, option, entityIdForFilename);
    if (events.length === 0) return;
    const ics = buildIcsCalendar(events);
    downloadIcs(ics, filename);
    onDownload();
  };

  return (
    <div className="add-to-calendar">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="add-to-calendar-btn"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Add to calendar
      </button>
      {open && (
        <>
          <div
            className="add-to-calendar-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="add-to-calendar-dropdown" role="menu">
            {OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => handleOption(value)}
                className="add-to-calendar-item"
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

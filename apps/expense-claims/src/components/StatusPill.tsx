import type { ClaimStatus } from "../types";
import { cn } from "../utils/cn";

const styles: Record<ClaimStatus, string> = {
  Draft: "bg-slate-200 text-slate-700",
  Submitted: "bg-violet/20 text-violet",
  "In Review": "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

export function StatusPill({ status }: { status: ClaimStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

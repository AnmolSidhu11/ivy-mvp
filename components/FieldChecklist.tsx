import type { RequiredFieldStatus } from "@/lib/types";

interface FieldChecklistProps {
  items: RequiredFieldStatus[];
}

export function FieldChecklist({ items }: FieldChecklistProps) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            className={
              "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]" +
              (item.complete
                ? " border-emerald-500 bg-emerald-50 text-emerald-700"
                : " border-amber-500 bg-amber-50 text-amber-700")
            }
          >
            {item.complete ? "✓" : "!"}
          </span>
          <span className={item.complete ? "text-zinc-700" : "text-zinc-800 font-medium"}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}


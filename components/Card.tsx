import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {title ? (
        <h2 className="mb-2 text-sm font-medium text-zinc-700">{title}</h2>
      ) : null}
      <div className="space-y-1 text-sm text-zinc-800">{children}</div>
    </section>
  );
}


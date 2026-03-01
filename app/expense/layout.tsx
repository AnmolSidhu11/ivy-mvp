import { Suspense } from "react";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>}>
      {children}
    </Suspense>
  );
}

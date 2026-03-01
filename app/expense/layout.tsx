import { Suspense } from "react";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-600">Expense</div>}>
      {children}
    </Suspense>
  );
}

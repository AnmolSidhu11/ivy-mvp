import { Suspense } from "react";
import { ConciergeCalendar } from "@/components/ConciergeCalendar";
import { DashboardNav } from "@/components/DashboardNav";

export default function CalendarPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const initialDate =
    typeof searchParams?.date === "string" && searchParams.date
      ? searchParams.date
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender via-lavender/95 to-violet font-sans text-zinc-900">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10 lg:px-8 lg:py-12">
        <DashboardNav />
        <main className="min-w-0 flex-1">
          <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Calendar</div>}>
            <ConciergeCalendar initialDate={initialDate} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}


import Link from "next/link";

const mockEvents = [
  {
    id: "event-1",
    hcpId: "hcp_2001",
    hcpName: "Dr. Patel",
    when: "Today · 10:30 AM",
    clinic: "Patel Dermatology",
  },
  {
    id: "event-2",
    hcpId: "hcp_2002",
    hcpName: "Dr. Chen",
    when: "Today · 2:00 PM",
    clinic: "Chen Hematology",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Next HCP calls with quick actions for pre-call prep and capture.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Today&apos;s calls</h2>
          <div className="space-y-3">
            {mockEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium">{event.hcpName}</p>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {event.when}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{event.clinic}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/precall/${event.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Pre-call brief
                  </Link>
                  <Link
                    href={`/capture/${event.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    Start capture
                  </Link>
                  <Link
                    href={`/hcp/${event.hcpId}`}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    View HCP
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}


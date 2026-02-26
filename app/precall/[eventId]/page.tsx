"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { getEventById, getHcpById } from "@/lib/mock";

export default function PrecallPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const event = getEventById(eventId);
  const hcp = event ? getHcpById(event.hcpId) : undefined;

  if (!event || !hcp) {
    return (
      <AppShell title="Pre-call brief" backHref="/dashboard">
        <p className="text-sm text-zinc-700">
          No event found for ID <span className="font-mono">{eventId}</span>.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pre-call brief" backHref="/dashboard">
      <Card title="HCP & visit">
        <p className="text-sm font-medium">
          {hcp.name} · {hcp.specialty}
        </p>
        <p className="text-sm text-zinc-700">
          {event.when} · {hcp.clinic}
        </p>
      </Card>

      <Card title="Last interaction summary">
        <p>
          Coverage barriers due to PA rejections; clinic is looking for a simple checklist
          and clear next steps for office staff.
        </p>
      </Card>

      <Card title="Open loops">
        <ul className="list-disc space-y-1 pl-5">
          {hcp.openLoops.map((loop) => (
            <li key={loop}>{loop}</li>
          ))}
        </ul>
      </Card>

      <Card title="Questions to ask">
        <ul className="list-disc space-y-1 pl-5">
          <li>What has changed since our last visit regarding coverage or workflow?</li>
          <li>
            Where does the team get stuck most often (forms, documentation, prior therapies)?
          </li>
        </ul>
      </Card>

      <Card title="Compliance reminders">
        <ul className="list-disc space-y-1 pl-5">
          <li>Use only approved product claims and reference materials.</li>
          <li>If benefits are discussed, mention fair balance risk language.</li>
          <li>Do not provide patient-specific dosing or treatment advice.</li>
        </ul>
      </Card>

      <div className="flex justify-end">
        <Link
          href={`/capture/${event.id}`}
          className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Start capture
        </Link>
      </div>
    </AppShell>
  );
}


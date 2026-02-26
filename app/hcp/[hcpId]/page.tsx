"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { getHcpById } from "@/lib/mock";

export default function HcpPage() {
  const params = useParams<{ hcpId: string }>();
  const hcpId = params.hcpId;
  const hcp = getHcpById(hcpId);

  if (!hcp) {
    return (
      <AppShell title="HCP not found" backHref="/dashboard">
        <p className="text-sm text-zinc-700">
          No HCP found for ID <span className="font-mono">{hcpId}</span>.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Back to dashboard
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={hcp.name} backHref="/dashboard">
      <Card title="Profile">
        <p className="text-sm font-medium">{hcp.name}</p>
        <p className="text-sm text-zinc-700">
          {hcp.specialty} · {hcp.clinic}
        </p>
      </Card>

      <Card title="Preferred contact">
        <p className="text-sm">
          {hcp.preferredContact.name} ({hcp.preferredContact.role})
        </p>
        <p className="text-sm text-zinc-700">{hcp.preferredContact.email}</p>
      </Card>

      <Card title="Open loops">
        {hcp.openLoops.length === 0 ? (
          <p className="text-sm text-zinc-600">No open loops.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {hcp.openLoops.map((loop) => (
              <li key={loop}>{loop}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Products discussed">
        {hcp.productsDiscussed.length === 0 ? (
          <p className="text-sm text-zinc-600">No recent products on record.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {hcp.productsDiscussed.map((p) => (
              <li
                key={p}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}


import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExpenseClaim, ClaimStatus } from "../types";
import { useRepo } from "../context/RepoContext";
import { StatusPill } from "../components/StatusPill";
import { TableSkeleton } from "../components/Skeleton";
import { cn } from "../utils/cn";

const STATUS_OPTIONS: ClaimStatus[] = ["Draft", "Submitted", "In Review", "Approved", "Rejected"];

export function Dashboard() {
  const { repo } = useRepo();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [visits, setVisits] = useState<{ id: string; hcpName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([repo.listClaims(), repo.listVisits()]).then(([c, v]) => {
      if (!cancelled) {
        setClaims(c);
        setVisits(v.map((x) => ({ id: x.id, hcpName: x.hcpName })));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const visitMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    visits.forEach((v) => (m[v.id] = v.hcpName));
    return m;
  }, [visits]);

  const filtered = React.useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      const q = search.toLowerCase();
      if (
        q &&
        !c.id.toLowerCase().includes(q) &&
        !c.visitId.toLowerCase().includes(q) &&
        !(visitMap[c.visitId] || "").toLowerCase().includes(q) &&
        !c.merchant.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [claims, statusFilter, categoryFilter, search, visitMap]);

  const categories = React.useMemo(() => {
    const set = new Set(claims.map((c) => c.category));
    return Array.from(set).sort();
  }, [claims]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Claims</h1>
        <p className="mt-1 text-sm text-slate-600">Filter and open claims.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by visit ID, HCP, merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm w-64",
              "focus:outline-none focus:ring-2 focus:ring-violet/30"
            )}
          />
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )
                }
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  statusFilter.includes(s) ? "bg-violet text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={cn(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-violet/30"
            )}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-500">No claims match your filters.</p>
            <button
              type="button"
              onClick={() => navigate("/new")}
              className="mt-3 rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover"
            >
              Create a claim
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-600">ID</th>
                <th className="px-4 py-3 font-medium text-slate-600">Visit / HCP</th>
                <th className="px-4 py-3 font-medium text-slate-600">Category</th>
                <th className="px-4 py-3 font-medium text-slate-600">Amount</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/claim/${c.id}`)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-lavender/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.id}</td>
                  <td className="px-4 py-3">
                    <div>{c.visitId}</div>
                    <div className="text-xs text-slate-500">{visitMap[c.visitId] ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.category}</td>
                  <td className="px-4 py-3">
                    {c.currency} {c.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

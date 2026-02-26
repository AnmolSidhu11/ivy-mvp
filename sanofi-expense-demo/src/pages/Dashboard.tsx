import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import type { ExpenseClaim, ClaimStatus, Visit } from "../types";
import { useRepo } from "../context/RepoContext";
import "./Dashboard.css";

const STATUS_OPTIONS: ClaimStatus[] = ["Draft", "Submitted", "In Review", "Approved", "Rejected"];

type DashboardTab = "claims" | "review";

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportFilteredToCsv(
  claims: ExpenseClaim[],
  visitById: Map<string, Visit>,
  formatDate: (iso: string) => string
): void {
  const headers = ["claimId", "status", "visitId", "hcpName", "date", "category", "amount", "currency", "merchant", "updatedAt"];
  const rows = claims.map((c) => {
    const visit = visitById.get(c.visitId);
    return [
      c.id,
      c.status,
      c.visitId,
      visit?.hcpName ?? "",
      formatDate(c.updatedAt),
      c.category,
      c.amount.toFixed(2),
      c.currency,
      c.merchant,
      c.updatedAt,
    ].map(String).map(escapeCsvCell);
  });
  const csv = [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expense_claims_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_PILL_CLASS: Record<ClaimStatus, string> = {
  Draft: "status-pill status-pill-draft",
  Submitted: "status-pill status-pill-submitted",
  "In Review": "status-pill status-pill-in-review",
  Approved: "status-pill status-pill-approved",
  Rejected: "status-pill status-pill-rejected",
};

function StatusPill({ status }: { status: ClaimStatus }) {
  return <span className={STATUS_PILL_CLASS[status]}>{status}</span>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Dashboard() {
  const { repo } = useRepo();
  const navigate = useNavigate();
  const location = useLocation();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "">("");
  const [tab, setTab] = useState<DashboardTab>("claims");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Refetch when navigating to Dashboard so new/updated claims appear.
  useEffect(() => {
    if (location.pathname !== "/") return;
    Promise.all([repo.listClaims(), repo.listVisits()]).then(
      ([c, v]) => {
        setClaims(c);
        setVisits(v);
      }
    );
  }, [location.pathname, repo]);

  const visitById = useMemo(
    () => new Map(visits.map((v) => [v.id, v])),
    [visits]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return claims.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (tab === "review" && c.status !== "In Review") return false;
      if (!q) return true;
      const visit = visitById.get(c.visitId);
      const hcp = (visit?.hcpName ?? "").toLowerCase();
      return (
        c.visitId.toLowerCase().includes(q) ||
        c.merchant.toLowerCase().includes(q) ||
        hcp.includes(q)
      );
    });
  }, [claims, statusFilter, search, visitById, tab]);

  const loadClaims = useCallback(() => {
    repo.listClaims().then(setClaims);
  }, [repo]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await repo.approveClaim(id);
      loadClaims();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await repo.rejectClaim(rejectingId, rejectReason.trim());
      setRejectingId(null);
      setRejectReason("");
      loadClaims();
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    exportFilteredToCsv(filtered, visitById, formatDate);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <div>
          <h1>{tab === "claims" ? "All Claims" : "Review Queue"}</h1>
          <p className="dashboard-subtitle">
            {tab === "claims"
              ? "Filter and view expense claims."
              : "Claims awaiting approval or rejection."}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" onClick={handleExportCsv} className="btn btn-secondary dashboard-export-btn">
            Export CSV
          </button>
          <div className="dashboard-tabs">
            <button
              type="button"
              onClick={() => setTab("claims")}
              className={`dashboard-tab ${tab === "claims" ? "dashboard-tab-active" : ""}`}
            >
              All Claims
            </button>
            <button
              type="button"
              onClick={() => setTab("review")}
              className={`dashboard-tab ${tab === "review" ? "dashboard-tab-active" : ""}`}
            >
              Review Queue
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-filters">
          <input
            type="text"
            placeholder="Search visit ID, HCP, merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || "") as ClaimStatus | "")}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-card">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Date</th>
              <th>Visit ID</th>
              <th>HCP</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Merchant</th>
              {tab === "review" && <th className="dashboard-th-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const visit = visitById.get(c.visitId);
              return (
                <tr
                  key={c.id}
                  className="dashboard-table-row-clickable"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest(".dashboard-row-actions")) return;
                    navigate(`/claim/${c.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && !(e.target as HTMLElement).closest(".dashboard-row-actions") && navigate(`/claim/${c.id}`)}
                >
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td>{formatDate(c.updatedAt)}</td>
                  <td className="cell-mono" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/visit/${c.visitId}`} className="dashboard-visit-link">
                      {c.visitId}
                    </Link>
                  </td>
                  <td>{visit?.hcpName ?? "—"}</td>
                  <td>{c.category}</td>
                  <td>
                    {c.currency} {c.amount.toFixed(2)}
                  </td>
                  <td>{c.merchant}</td>
                  {tab === "review" && (
                    <td className="dashboard-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleApprove(c.id)}
                        disabled={actionLoading}
                        className="dashboard-inline-btn dashboard-inline-btn-approve"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(c.id)}
                        disabled={actionLoading}
                        className="dashboard-inline-btn dashboard-inline-btn-reject"
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="dashboard-empty">
            {tab === "review" ? "No claims in review." : "No claims match the filters."}
          </div>
        )}
      </div>

      {rejectingId && (
        <>
          <div className="dashboard-modal-overlay" onClick={() => setRejectingId(null)} aria-hidden />
          <div className="dashboard-reject-modal" role="dialog" aria-labelledby="dashboard-reject-title">
            <h3 id="dashboard-reject-title">Reject claim</h3>
            <p className="dashboard-reject-desc">Provide a reason (required).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Amount over limit"
              className="dashboard-reject-textarea"
              rows={3}
            />
            <div className="dashboard-reject-actions">
              <button type="button" onClick={() => { setRejectingId(null); setRejectReason(""); }} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="btn btn-danger"
              >
                {actionLoading ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

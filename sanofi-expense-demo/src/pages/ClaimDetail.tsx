import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { ExpenseClaim, ClaimStatus, Visit } from "../types";
import { useRepo } from "../context/RepoContext";
import {
  BRONZE_CLAIM_PATH,
  BRONZE_RECEIPT_PATH,
  SILVER_PATH,
  GOLD_PATH,
  getBronzeClaimJson,
  getBronzeReceiptJson,
  getSilverEnrichedJson,
  getGoldCurrentJson,
} from "../utils/lakeOutputs";
import { simulateBlobCreated } from "../utils/eventTriggerSimulation";
import { LocalCalendarRepo } from "../repos/LocalCalendarRepo";
import {
  nextBusinessDayAt9Utc,
  nextBusinessDayAt11Utc,
  todayOrTomorrowAt17Utc,
  toIso,
  addMinutes,
} from "../utils/calendarHelpers";
import { AddToCalendarDropdown } from "../components/AddToCalendarDropdown";
import "./Dashboard.css";
import "./ClaimDetail.css";

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function copyJson(json: object) {
  navigator.clipboard.writeText(JSON.stringify(json, null, 2));
}

function LakeSection({
  title,
  path,
  pathLabel,
  json,
  defaultOpen = false,
}: {
  title: string;
  path: string;
  pathLabel?: string;
  json: object;
  defaultOpen?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const str = JSON.stringify(json, null, 2);
  const handleCopy = () => {
    copyJson(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <details className="lake-details" open={defaultOpen}>
      <summary className="lake-summary">{title}</summary>
      <div className="lake-section-body">
        <p className="lake-path">
          {pathLabel ?? "Path:"} <code>{path}</code>
        </p>
        <div className="lake-actions">
          <button type="button" onClick={handleCopy} className="btn btn-secondary lake-copy-btn">
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre className="lake-json">{str}</pre>
      </div>
    </details>
  );
}

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const { repo, pipelineRunner } = useRepo();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [eventToast, setEventToast] = useState(false);
  const [calendarToast, setCalendarToast] = useState<{ message: string } | null>(null);
  const [icsToast, setIcsToast] = useState(false);

  const visitById = useMemo(
    () => new Map(visits.map((v) => [v.id, v])),
    [visits]
  );
  const visit = claim ? visitById.get(claim.visitId) : null;
  const auditReversed = claim ? [...claim.auditTrail].reverse() : [];

  const loadClaim = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([repo.getClaim(id), repo.listVisits()]).then(([c, v]) => {
      setClaim(c ?? null);
      setVisits(v);
      setLoading(false);
    });
  }, [id, repo]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  const handleSubmit = async () => {
    if (!claim || claim.status !== "Draft") return;
    setActionLoading(true);
    try {
      const submitted = await repo.submitClaim(claim.id);
      if (submitted) {
        setEventToast(true);
        setTimeout(() => setEventToast(false), 3000);
        await simulateBlobCreated(claim.id, BRONZE_CLAIM_PATH(claim.id), repo, pipelineRunner);
        const updated = await repo.getClaim(claim.id);
        if (updated) setClaim(updated);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!claim || claim.status !== "Draft") return;
    if (!window.confirm("Delete this draft claim?")) return;
    setActionLoading(true);
    try {
      const ok = await repo.deleteDraft(claim.id);
      if (ok) navigate("/");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!claim || claim.status !== "In Review") return;
    setActionLoading(true);
    try {
      const updated = await repo.approveClaim(claim.id);
      if (updated) setClaim(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!claim || claim.status !== "In Review" || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await repo.rejectClaim(claim.id, rejectReason.trim());
      if (updated) {
        setClaim(updated);
        setShowRejectModal(false);
        setRejectReason("");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!claim || claim.status !== "Rejected") return;
    setActionLoading(true);
    try {
      const updated = await repo.resubmitRejected(claim.id);
      if (updated) setClaim(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const scheduleCalendarEvent = async (
    type: "Pre-call" | "Post-call" | "Expense",
    start: Date,
    end: Date,
    title: string
  ) => {
    if (!claim || !visit) return;
    const id = `evt-${claim.id}-${type.toLowerCase().replace("-", "")}-${Date.now()}`;
    await LocalCalendarRepo.createEvent({
      id,
      title,
      type: type === "Pre-call" ? "Pre-call" : type === "Post-call" ? "Post-call" : "Expense",
      status: "Planned",
      startAt: toIso(start),
      endAt: toIso(end),
      hcpName: visit.hcpName,
      visitId: claim.visitId,
      claimId: claim.id,
      notes: type === "Expense" ? `Expense reminder for claim ${claim.id}` : undefined,
    });
    setCalendarToast({
      message: type === "Pre-call" ? "Pre-call scheduled" : type === "Post-call" ? "Post-call scheduled" : "Expense reminder scheduled",
    });
    setTimeout(() => setCalendarToast(null), 4000);
  };

  const handleSchedulePreCall = () => {
    if (!claim || !visit) return;
    const start = nextBusinessDayAt9Utc();
    const end = addMinutes(start, 15);
    scheduleCalendarEvent("Pre-call", start, end, `Pre-call: ${visit.hcpName}`);
  };

  const handleSchedulePostCall = () => {
    if (!claim || !visit) return;
    const start = nextBusinessDayAt11Utc();
    const end = addMinutes(start, 15);
    scheduleCalendarEvent("Post-call", start, end, `Post-call: ${visit.hcpName}`);
  };

  const handleScheduleExpenseReminder = () => {
    if (!claim || !visit) return;
    const start = todayOrTomorrowAt17Utc();
    const end = addMinutes(start, 15);
    scheduleCalendarEvent("Expense", start, end, "Expense reminder");
  };

  if (loading && !claim) {
    return (
      <div className="dashboard">
        <div className="dashboard-card claim-detail-skeleton">
          <p className="claim-detail-loading">Loading claim…</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="dashboard">
        <div className="dashboard-card claim-detail-skeleton">
          <p className="claim-detail-loading">Claim not found.</p>
          <Link to="/" className="nav-link-button" style={{ marginTop: "0.75rem" }}>
            Back to Claims
          </Link>
        </div>
      </div>
    );
  }

  const receipt = claim.receipt;
  const hasReceiptUrl = receipt?.mockUrl;

  return (
    <div className="dashboard">
      {eventToast && (
        <div className="event-toast" role="status">
          BlobCreated → policyEnricher triggered
        </div>
      )}
      {calendarToast && (
        <div className="event-toast event-toast-calendar" role="status">
          {calendarToast.message}. <Link to="/calendar" className="event-toast-link">View in Calendar</Link>
        </div>
      )}
      {icsToast && (
        <div className="event-toast" role="status">
          Downloaded invite. Open to add it to your calendar (Apple/Google/Outlook).
        </div>
      )}
      <div className="claim-detail-header">
        <Link to="/" className="claim-detail-back">
          ← Back to Claims
        </Link>
        <h1>Claim {claim.id}</h1>
        <StatusPill status={claim.status} />
      </div>

      <div className="claim-detail-grid">
        <div className="claim-detail-main">
          <div className="dashboard-card claim-detail-card">
            <h2 className="claim-detail-card-title">Summary</h2>
            <dl className="claim-detail-summary">
              <div className="claim-detail-summary-row">
                <dt>Visit</dt>
                <dd>{claim.visitId}</dd>
              </div>
              <div className="claim-detail-summary-row">
                <dt>HCP</dt>
                <dd>{visit?.hcpName ?? "—"}</dd>
              </div>
              <div className="claim-detail-summary-row">
                <dt>Category</dt>
                <dd>{claim.category}</dd>
              </div>
              <div className="claim-detail-summary-row">
                <dt>Amount</dt>
                <dd>
                  {claim.currency} {claim.amount.toFixed(2)}
                </dd>
              </div>
              <div className="claim-detail-summary-row">
                <dt>Merchant</dt>
                <dd>{claim.merchant}</dd>
              </div>
              <div className="claim-detail-summary-row">
                <dt>Status</dt>
                <dd>
                  <StatusPill status={claim.status} />
                </dd>
              </div>
            </dl>
          </div>

          {claim.policy.blocks.length > 0 && (
            <div className="dashboard-card claim-detail-card claim-policy-blocks">
              <h2 className="claim-detail-card-title">Policy blocks</h2>
              <ul className="claim-policy-list">
                {claim.policy.blocks.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {claim.policy.warnings.length > 0 && (
            <div className="dashboard-card claim-detail-card claim-policy-warnings">
              <h2 className="claim-detail-card-title">Warnings</h2>
              <ul className="claim-policy-list">
                {claim.policy.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="dashboard-card claim-detail-card">
            <h2 className="claim-detail-card-title">Audit trail</h2>
            <ul className="claim-audit-timeline">
              {auditReversed.map((e, i) => (
                <li key={i} className="claim-audit-item">
                  <span className="claim-audit-action">
                    {e.action}
                    {e.detail ? `: ${e.detail}` : ""}
                  </span>
                  <span className="claim-audit-meta">
                    {formatDateTime(e.ts)} · {e.actor}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-card claim-detail-card claim-lake-outputs">
            <h2 className="claim-detail-card-title">Lake Outputs</h2>
            <p className="lake-outputs-desc">Simulated ADLS paths and JSON previews.</p>
            <div className="lake-sections">
              <details className="lake-details">
                <summary className="lake-summary">Bronze (raw)</summary>
                <div className="lake-section-body">
                  <p className="lake-path">
                    Path: <code>{BRONZE_CLAIM_PATH(claim.id)}</code>
                  </p>
                  <div className="lake-actions">
                    <button
                      type="button"
                      onClick={() => copyJson(getBronzeClaimJson(claim))}
                      className="btn btn-secondary lake-copy-btn"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="lake-json">
                    {JSON.stringify(getBronzeClaimJson(claim), null, 2)}
                  </pre>
                  {claim.receipt && (
                    <>
                      <p className="lake-path lake-path-second">
                        Path: <code>{BRONZE_RECEIPT_PATH(claim.id, claim.receipt.fileName)}</code>
                      </p>
                      <div className="lake-actions">
                        <button
                          type="button"
                          onClick={() => {
                            const j = getBronzeReceiptJson(claim);
                            if (j) copyJson(j);
                          }}
                          className="btn btn-secondary lake-copy-btn"
                        >
                          Copy receipt metadata JSON
                        </button>
                      </div>
                      <pre className="lake-json">
                        {JSON.stringify(getBronzeReceiptJson(claim), null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              </details>
              <LakeSection
                title="Silver (enriched)"
                path={SILVER_PATH(claim.id)}
                json={getSilverEnrichedJson(claim, visit ?? null)}
              />
              <LakeSection
                title="Gold (current)"
                path={GOLD_PATH(claim.id)}
                json={getGoldCurrentJson(claim, visit ?? null)}
                defaultOpen
              />
            </div>
          </div>
        </div>

        <div className="claim-detail-sidebar">
          <div className="dashboard-card claim-detail-card">
            <h2 className="claim-detail-card-title">Receipt</h2>
            {receipt ? (
              <div className="claim-receipt-preview">
                <p className="claim-receipt-filename">{receipt.fileName}</p>
                <p className="claim-receipt-meta">
                  {receipt.mimeType} · {(receipt.size / 1024).toFixed(1)} KB
                </p>
                {hasReceiptUrl && (
                  <>
                    {receipt.mimeType.startsWith("image/") ? (
                      <img
                        src={receipt.mockUrl}
                        alt="Receipt"
                        className="claim-receipt-image"
                      />
                    ) : (
                      <a
                        href={receipt.mockUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="claim-receipt-link"
                      >
                        Open receipt
                      </a>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="claim-receipt-empty">No receipt attached.</p>
            )}
          </div>

          <div className="dashboard-card claim-detail-card">
            <h2 className="claim-detail-card-title">Visit actions</h2>
            <div className="claim-visit-actions">
              <button
                type="button"
                onClick={handleSchedulePreCall}
                className="btn btn-secondary claim-visit-action-btn"
              >
                Schedule Pre-call
              </button>
              <button
                type="button"
                onClick={handleSchedulePostCall}
                className="btn btn-secondary claim-visit-action-btn"
              >
                Schedule Post-call
              </button>
              <button
                type="button"
                onClick={handleScheduleExpenseReminder}
                className="btn btn-secondary claim-visit-action-btn"
              >
                Schedule Expense Reminder
              </button>
            </div>
          </div>

          {claim.visitId && (
            <div className="dashboard-card claim-detail-card">
              <h2 className="claim-detail-card-title">Add to Calendar</h2>
              <AddToCalendarDropdown
                params={{
                  visitId: claim.visitId,
                  hcpName: visit?.hcpName ?? "—",
                  claimId: claim.id,
                }}
                entityIdForFilename={claim.id}
                onDownload={() => {
                  setIcsToast(true);
                  setTimeout(() => setIcsToast(false), 4000);
                }}
              />
            </div>
          )}

          <div className="claim-detail-actions">
            {claim.status === "Draft" && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={claim.policy.blocks.length > 0 || actionLoading}
                  className="btn btn-primary claim-action-btn"
                >
                  {actionLoading ? "Submitting…" : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn btn-danger claim-action-btn"
                >
                  Delete
                </button>
              </>
            )}
            {claim.status === "In Review" && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn btn-primary claim-action-btn"
                >
                  {actionLoading ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="btn btn-danger claim-action-btn"
                >
                  Reject
                </button>
              </>
            )}
            {claim.status === "Rejected" && (
              <button
                type="button"
                onClick={handleResubmit}
                disabled={actionLoading}
                className="btn btn-primary claim-action-btn"
              >
                {actionLoading ? "Updating…" : "Edit & Resubmit"}
              </button>
            )}
            {claim.status === "Approved" && (
              <p className="claim-readonly">No actions available.</p>
            )}
            {claim.status === "Submitted" && (
              <p className="claim-readonly">Awaiting review.</p>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <>
          <div
            className="claim-modal-overlay"
            onClick={() => setShowRejectModal(false)}
            aria-hidden
          />
          <div className="claim-modal" role="dialog" aria-labelledby="reject-modal-title">
            <h3 id="reject-modal-title">Reject claim</h3>
            <p className="claim-modal-desc">Provide a reason (required).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Amount over limit"
              className="claim-modal-textarea"
              rows={3}
            />
            <div className="claim-modal-actions">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn btn-secondary"
              >
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

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { ExpenseClaim } from "../types";
import { useRepo } from "../context/RepoContext";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";
import { getReceiptPreviewUrl } from "../utils/receiptUrl";
import { cn } from "../utils/cn";

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { repo, adlsConfig } = useRepo();
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [visitName, setVisitName] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    repo.getClaim(id).then((c) => {
      if (!cancelled) setClaim(c);
      setLoading(false);
    });
  }, [id, repo]);

  useEffect(() => {
    if (!claim) return;
    repo.listVisits().then((visits) => {
      const v = visits.find((x) => x.id === claim.visitId);
      setVisitName(v?.hcpName ?? "");
    });
  }, [claim, repo]);

  const handleSubmit = async () => {
    if (!claim || claim.status !== "Draft") return;
    const updated = await repo.submitClaim(claim.id);
    if (updated) setClaim(updated);
  };

  const handleSendToReview = async () => {
    if (!claim || claim.status !== "Submitted") return;
    const updated = await repo.sendToReview(claim.id);
    if (updated) setClaim(updated);
  };

  const handleApprove = async () => {
    if (!claim || claim.status !== "In Review") return;
    const updated = await repo.approveClaim(claim.id);
    if (updated) setClaim(updated);
  };

  const handleReject = async () => {
    if (!claim || claim.status !== "In Review" || !rejectReason.trim()) return;
    const updated = await repo.rejectClaim(claim.id, rejectReason.trim());
    if (updated) {
      setClaim(updated);
      setShowRejectModal(false);
      setRejectReason("");
    }
  };

  const handleResubmit = async () => {
    if (!claim || claim.status !== "Rejected") return;
    const updated = await repo.resubmitRejected(claim.id);
    if (updated) {
      setClaim(updated);
      navigate(`/claim/${claim.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!claim || claim.status !== "Draft") return;
    if (!window.confirm("Delete this draft?")) return;
    const ok = await repo.deleteDraft(claim.id);
    if (ok) navigate("/");
  };

  if (loading || !claim) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-violet hover:underline"
          >
            ← Back to list
          </button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Claim {claim.id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Visit {claim.visitId} · {visitName}
          </p>
        </div>
        <StatusPill status={claim.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Category</dt>
                <dd className="text-slate-900">{claim.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Merchant</dt>
                <dd className="text-slate-900">{claim.merchant}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-medium text-slate-900">
                  {claim.currency} {claim.amount.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Attendees</dt>
                <dd className="text-slate-900">
                  {claim.attendees.map((a) => `${a.name} (${a.role})`).join(", ") || "—"}
                </dd>
              </div>
              {claim.notes && (
                <div>
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="mt-1 text-slate-700">{claim.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Audit trail</h2>
            <ul className="mt-3 space-y-2">
              {claim.auditTrail.map((e, i) => (
                <li key={i} className="flex flex-col text-xs">
                  <span className="font-medium text-slate-700">
                    {e.action}
                    {e.detail ? `: ${e.detail}` : ""}
                  </span>
                  <span className="text-slate-500">
                    {new Date(e.ts).toLocaleString()} · {e.actor}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Receipt</h2>
            {claim.receipt ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-slate-700 truncate">{claim.receipt.fileName}</p>
                <p className="text-xs text-slate-500">
                  {claim.receipt.mimeType} · {(claim.receipt.size / 1024).toFixed(1)} KB
                </p>
                {claim.receipt.mimeType.startsWith("image/") && (() => {
                  const url = getReceiptPreviewUrl(claim.receipt, adlsConfig);
                  return url ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <img src={url} alt="Receipt" className="max-h-48 w-full object-contain" />
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const url = getReceiptPreviewUrl(claim.receipt, adlsConfig);
                  return url && !claim.receipt.mimeType.startsWith("image/") ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-xl bg-lavender/60 px-3 py-2 text-xs font-medium text-violet hover:bg-lavender"
                    >
                      Open receipt
                    </a>
                  ) : url ? null : (
                    claim.receipt.mockUrl && (
                      <a
                        href={claim.receipt.mockUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-xl bg-lavender/60 px-3 py-2 text-xs font-medium text-violet hover:bg-lavender"
                      >
                        Preview (mock)
                      </a>
                    )
                  );
                })()}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No receipt attached.</p>
            )}
          </div>

          {claim.policy.warnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <h3 className="text-xs font-semibold text-amber-800">Warnings</h3>
              <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
                {claim.policy.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {claim.policy.blocks.length > 0 && (
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
              <h3 className="text-xs font-semibold text-red-800">Blocks</h3>
              <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                {claim.policy.blocks.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {claim.status === "Draft" && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/claim/${claim.id}/edit`)}
                  className={cn(
                    "w-full rounded-xl px-4 py-2 text-sm font-medium",
                    "bg-violet text-white hover:bg-violet-hover"
                  )}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={claim.policy.blocks.length > 0}
                  className={cn(
                    "w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium",
                    "hover:bg-slate-50 disabled:opacity-50"
                  )}
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
            {claim.status === "Submitted" && (
              <button
                type="button"
                onClick={handleSendToReview}
                className="w-full rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover"
              >
                Send to Review
              </button>
            )}
            {claim.status === "In Review" && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Reject
                </button>
              </>
            )}
            {claim.status === "Rejected" && (
              <button
                type="button"
                onClick={handleResubmit}
                className="w-full rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover"
              >
                Edit & Resubmit
              </button>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowRejectModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject claim</h3>
            <p className="mt-1 text-sm text-slate-600">Provide a reason (required).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Amount over limit"
              className={cn(
                "mt-3 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-violet/30"
              )}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

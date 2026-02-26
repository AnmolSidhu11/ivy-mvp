import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Visit, ExpenseClaim, Attendee } from "../types";
import { useRepo } from "../context/RepoContext";
import { evaluatePolicy } from "../policy/policyEngine";
import { cn } from "../utils/cn";

const CATEGORIES = ["Meal", "Taxi/Rideshare", "Parking", "Hotel", "Other"];
const CURRENCIES = ["CAD", "USD", "EUR", "GBP"];

export function CreateClaimWizard() {
  const params = useParams<{ id?: string }>();
  const claimId = params.id ?? null;
  const navigate = useNavigate();
  const { repo } = useRepo();
  const [step, setStep] = useState(1);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitId, setVisitId] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [visitDropdownOpen, setVisitDropdownOpen] = useState(false);
  const [category, setCategory] = useState("Meal");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: "", role: "" }]);
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [businessPurpose, setBusinessPurpose] = useState(false);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [noAlcohol, setNoAlcohol] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingClaim, setExistingClaim] = useState<ExpenseClaim | null>(null);

  const isEdit = Boolean(claimId);

  useEffect(() => {
    repo.listVisits().then(setVisits);
  }, [repo]);

  useEffect(() => {
    if (!claimId) return;
    repo.getClaim(claimId).then((c) => {
      if (c && c.status === "Draft") {
        setExistingClaim(c);
        setVisitId(c.visitId);
        setCategory(c.category);
        setMerchant(c.merchant);
        setAmount(String(c.amount));
        setCurrency(c.currency);
        setAttendees(c.attendees.length ? c.attendees : [{ name: "", role: "" }]);
        setNotes(c.notes);
        setBusinessPurpose(c.flags.businessPurpose);
        setPolicyConfirmed(c.flags.policyConfirmed);
        setNoAlcohol(c.flags.noAlcohol);
      }
    });
  }, [claimId, repo]);

  const draft = {
    visitId,
    repName: "Rep User",
    category,
    merchant,
    amount: Number(amount) || 0,
    currency,
    attendees: attendees.filter((a) => a.name.trim()),
    receipt: receipt
      ? { fileName: receipt.name, mimeType: receipt.type, size: receipt.size }
      : existingClaim?.receipt ?? null,
    notes,
    flags: { noAlcohol, businessPurpose, policyConfirmed },
  };

  const policy = evaluatePolicy(draft);
  const canSubmit = policy.blocks.length === 0;

  const selectedVisit = visits.find((v) => v.id === visitId);
  const visitFilter = visitSearch.toLowerCase().trim();
  const filteredVisits = visitFilter
    ? visits.filter(
        (v) =>
          v.id.toLowerCase().includes(visitFilter) ||
          v.hcpName.toLowerCase().includes(visitFilter) ||
          v.date.includes(visitFilter) ||
          v.location.toLowerCase().includes(visitFilter)
      )
    : visits;

  const addAttendee = () => setAttendees((p) => [...p, { name: "", role: "" }]);
  const removeAttendee = (i: number) => setAttendees((p) => p.filter((_, j) => j !== i));
  const updateAttendee = (i: number, key: "name" | "role", v: string) => {
    setAttendees((p) => p.map((a, j) => (j === i ? { ...a, [key]: v } : a)));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (existingClaim) {
        const updated = await repo.updateDraft(existingClaim.id, {
          ...draft,
          receipt: draft.receipt
            ? {
                fileName: draft.receipt.fileName,
                mimeType: draft.receipt.mimeType,
                size: draft.receipt.size,
              }
            : null,
        });
        if (updated) {
          if (receipt && repo.uploadReceipt) await repo.uploadReceipt(updated.id, receipt);
          navigate(`/claim/${updated.id}`);
        }
      } else {
        const created = await repo.createDraft(draft);
        if (receipt && repo.uploadReceipt) await repo.uploadReceipt(created.id, receipt);
        navigate(`/claim/${created.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (existingClaim) {
        const updated = await repo.updateDraft(existingClaim.id, {
          ...draft,
          receipt: draft.receipt
            ? { fileName: draft.receipt.fileName, mimeType: draft.receipt.mimeType, size: draft.receipt.size }
            : null,
        });
        if (updated) {
          if (receipt && repo.uploadReceipt) await repo.uploadReceipt(updated.id, receipt);
          const submitted = await repo.submitClaim(updated.id);
          if (submitted) navigate(`/claim/${submitted.id}`);
        }
      } else {
        const created = await repo.createDraft(draft);
        if (receipt && repo.uploadReceipt) await repo.uploadReceipt(created.id, receipt);
        const submitted = await repo.submitClaim(created.id);
        if (submitted) navigate(`/claim/${submitted.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet/30";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-violet hover:underline">
          ← Back
        </button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEdit ? "Edit claim" : "New claim"}
        </h1>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium",
                step === s ? "bg-violet text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              Step {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Select Visit</h2>
            <div className="relative">
              <input
                type="text"
                value={visitDropdownOpen ? visitSearch : selectedVisit ? `${selectedVisit.id} · ${selectedVisit.hcpName} · ${selectedVisit.date}` : visitSearch}
                onChange={(e) => {
                  setVisitSearch(e.target.value);
                  setVisitDropdownOpen(true);
                  if (!e.target.value) setVisitId("");
                }}
                onFocus={() => setVisitDropdownOpen(true)}
                placeholder="Search by visit ID, HCP, date, location..."
                className={inputCls}
              />
              {visitDropdownOpen && (
                <>
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredVisits.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-slate-500">No visits match.</div>
                    ) : (
                      filteredVisits.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVisitId(v.id);
                            setVisitSearch("");
                            setVisitDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-lavender/50",
                            visitId === v.id && "bg-lavender/50"
                          )}
                        >
                          {v.id} · {v.hcpName} · {v.date}
                        </button>
                      ))
                    )}
                  </div>
                  <div
                    className="fixed inset-0 z-[5]"
                    aria-hidden
                    onClick={() => setVisitDropdownOpen(false)}
                  />
                </>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!visitId}
                className="rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Expense details</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. The Keg"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Attendees</label>
                <button type="button" onClick={addAttendee} className="text-xs text-violet hover:underline">
                  + Add
                </button>
              </div>
              {attendees.map((a, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input
                    value={a.name}
                    onChange={(e) => updateAttendee(i, "name", e.target.value)}
                    placeholder="Name"
                    className={cn(inputCls, "flex-1")}
                  />
                  <input
                    value={a.role}
                    onChange={(e) => updateAttendee(i, "role", e.target.value)}
                    placeholder="HCP / Rep"
                    className={cn(inputCls, "w-28")}
                  />
                  <button type="button" onClick={() => removeAttendee(i)} className="rounded-xl border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Business purpose..."
                className={cn(inputCls, "min-h-[80px]")}
              />
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Receipt & confirmations</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Receipt</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover">
                Upload
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="ml-2 text-sm text-slate-600">
                {receipt ? receipt.name : existingClaim?.receipt ? `Current: ${existingClaim.receipt.fileName}` : "No file"}
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex gap-2">
                <input type="checkbox" checked={businessPurpose} onChange={(e) => setBusinessPurpose(e.target.checked)} />
                <span className="text-sm text-slate-700">Business purpose confirmed</span>
              </label>
              <label className="flex gap-2">
                <input type="checkbox" checked={noAlcohol} onChange={(e) => setNoAlcohol(e.target.checked)} />
                <span className="text-sm text-slate-700">No alcohol (or excluded per policy)</span>
              </label>
              <label className="flex gap-2">
                <input type="checkbox" checked={policyConfirmed} onChange={(e) => setPolicyConfirmed(e.target.checked)} />
                <span className="text-sm text-slate-700">Policy & limits confirmed</span>
              </label>
            </div>
            {policy.blocks.length > 0 && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {policy.blocks.map((b, i) => (
                  <div key={i}>{b}</div>
                ))}
              </div>
            )}
            {policy.warnings.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                {policy.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="rounded-xl bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-hover disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

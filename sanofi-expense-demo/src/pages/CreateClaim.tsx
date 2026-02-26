import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Visit, Attendee, ReceiptInfo, ClaimFlags } from "../types";
import type { DraftPayload } from "../repos/ClaimsRepo";
import { useRepo } from "../context/RepoContext";
import { evaluatePolicy } from "../policy/policyEngine";
import { getMealLimitPerPersonCad } from "../policy/policyConfig";
import { simulateBlobCreated } from "../utils/eventTriggerSimulation";
import { BRONZE_CLAIM_PATH, BRONZE_RECEIPT_PATH } from "../utils/lakeOutputs";
import { LocalCalendarRepo } from "../repos/LocalCalendarRepo";
import { todayOrTomorrowAt17Utc, toIso, addMinutes, getTodayRangeUtc } from "../utils/calendarHelpers";
import "./Dashboard.css";
import "./CreateClaim.css";

const CATEGORIES = ["Meal", "Taxi/Rideshare", "Parking", "Hotel", "Other"];
const CURRENCIES = ["CAD", "USD"];

const defaultFlags: ClaimFlags = {
  noAlcohol: true,
  businessPurpose: false,
  policyConfirmed: false,
};

function buildDraftPayload(form: {
  visitId: string;
  category: string;
  merchant: string;
  amount: string;
  currency: string;
  attendees: Attendee[];
  receipt: ReceiptInfo | null;
  notes: string;
  flags: ClaimFlags;
}): DraftPayload {
  return {
    visitId: form.visitId,
    repName: "Rep User",
    category: form.category,
    merchant: form.merchant.trim(),
    amount: Number(form.amount) || 0,
    currency: form.currency,
    attendees: form.attendees.filter((a) => a.name.trim() || a.role.trim()),
    receipt: form.receipt,
    notes: form.notes.trim(),
    flags: form.flags,
  };
}

export function CreateClaim() {
  const { repo, pipelineRunner } = useRepo();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitId, setVisitId] = useState("");
  const [category, setCategory] = useState("Meal");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: "", role: "" }]);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [notes, setNotes] = useState("");
  const [flags, setFlags] = useState<ClaimFlags>(defaultFlags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventToast, setEventToast] = useState(false);

  useEffect(() => {
    repo.listVisits().then(setVisits);
  }, [repo]);

  const form = {
    visitId,
    category,
    merchant,
    amount,
    currency,
    attendees,
    receipt,
    notes,
    flags,
  };
  const draftPayload = buildDraftPayload(form);
  const policy = evaluatePolicy(draftPayload);
  const canSubmit = policy.blocks.length === 0;

  const mealLimitCad = getMealLimitPerPersonCad();
  const attendeeCount = Math.max(1, form.attendees.filter((a) => a.name.trim() || a.role.trim()).length);
  const amountNum = Number(form.amount) || 0;
  const mealExceedsLimit =
    form.category === "Meal" &&
    form.currency === "CAD" &&
    attendeeCount > 0 &&
    amountNum > mealLimitCad * attendeeCount;

  const addAttendee = () => setAttendees((p) => [...p, { name: "", role: "" }]);
  const removeAttendee = (i: number) => setAttendees((p) => p.filter((_, j) => j !== i));
  const updateAttendee = (i: number, field: keyof Attendee, value: string) => {
    setAttendees((p) => p.map((a, j) => (j === i ? { ...a, [field]: value } : a)));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceipt(null);
      return;
    }
    setReceipt({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  };

  const goToDashboard = () => navigate("/", { state: { refresh: true } });

  const handleSaveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      const created = await repo.createDraft(draftPayload);
      if (draftPayload.receipt) {
        setEventToast(true);
        setTimeout(() => setEventToast(false), 3000);
        await simulateBlobCreated(
          created.id,
          BRONZE_RECEIPT_PATH(created.id, draftPayload.receipt.fileName),
          repo,
          pipelineRunner
        );
      }
      goToDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      const created = await repo.createDraft(draftPayload);
      const submitted = await repo.submitClaim(created.id);
      if (!submitted) {
        setError("Submit failed (policy blocks or invalid state)");
        setSaving(false);
        return;
      }
      setEventToast(true);
      setTimeout(() => setEventToast(false), 3000);
      await simulateBlobCreated(created.id, BRONZE_CLAIM_PATH(created.id), repo, pipelineRunner);
      const visit = visits.find((v) => v.id === draftPayload.visitId);
      if (visit) {
        const { startIso, endIso } = getTodayRangeUtc();
        const existing = await LocalCalendarRepo.listEvents(startIso, endIso);
        const hasExpenseForClaim = existing.some(
          (e) => e.claimId === created.id && e.type === "Expense"
        );
        if (!hasExpenseForClaim) {
          const start = todayOrTomorrowAt17Utc();
          const end = addMinutes(start, 15);
          await LocalCalendarRepo.createEvent({
            id: `evt-${created.id}-expense-${Date.now()}`,
            title: "Expense reminder",
            type: "Expense",
            status: "Planned",
            startAt: toIso(start),
            endAt: toIso(end),
            hcpName: visit.hcpName,
            visitId: draftPayload.visitId,
            claimId: created.id,
            notes: `Expense reminder for claim ${created.id}`,
          });
        }
      }
      goToDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      {eventToast && (
        <div className="event-toast" role="status">
          BlobCreated → policyEnricher triggered
        </div>
      )}
      <div className="dashboard-card create-claim-card">
        <div className="create-claim-header">
          <h1>Create Claim</h1>
          <Link to="/" className="nav-link-button create-claim-back">
            Back to Claims
          </Link>
        </div>

        {error && (
          <div className="create-claim-error" role="alert">
            {error}
          </div>
        )}

        <div className="create-claim-form">
          <div className="form-row">
            <label>Visit</label>
            <select
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              className="form-input"
            >
              <option value="">Select visit...</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} · {v.hcpName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. The Keg"
              className="form-input"
            />
          </div>

          <div className="form-row form-row-inline">
            <div className="form-group">
              <label>Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label>Attendees (name · role)</label>
            {attendees.map((a, i) => (
              <div key={i} className="attendee-row">
                <input
                  type="text"
                  value={a.name}
                  onChange={(e) => updateAttendee(i, "name", e.target.value)}
                  placeholder="Name"
                  className="form-input form-input-sm"
                />
                <input
                  type="text"
                  value={a.role}
                  onChange={(e) => updateAttendee(i, "role", e.target.value)}
                  placeholder="HCP / Rep"
                  className="form-input form-input-sm form-input-role"
                />
                <button
                  type="button"
                  onClick={() => removeAttendee(i)}
                  className="form-remove-btn"
                  aria-label="Remove attendee"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addAttendee} className="form-add-btn">
              + Add attendee
            </button>
          </div>

          <div className="form-row">
            <label>Receipt</label>
            <div className="receipt-upload">
              <input
                type="file"
                id="receipt-file"
                accept="image/*,.pdf"
                onChange={onFileChange}
                className="form-file-input"
              />
              <label htmlFor="receipt-file" className="form-file-label">
                {receipt ? receipt.fileName : "Choose file"}
              </label>
            </div>
          </div>

          <div className="form-row">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Business purpose..."
              className="form-input form-textarea"
              rows={3}
            />
          </div>

          <div className="form-row form-flags">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={flags.noAlcohol}
                onChange={(e) => setFlags((f) => ({ ...f, noAlcohol: e.target.checked }))}
              />
              No alcohol (or excluded per policy)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={flags.businessPurpose}
                onChange={(e) =>
                  setFlags((f) => ({ ...f, businessPurpose: e.target.checked }))
                }
              />
              Business purpose confirmed
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={flags.policyConfirmed}
                onChange={(e) =>
                  setFlags((f) => ({ ...f, policyConfirmed: e.target.checked }))
                }
              />
              Policy & limits confirmed
            </label>
          </div>

          {mealExceedsLimit && (
            <div className="form-policy form-policy-warnings create-claim-meal-warning" role="status">
              Meal amount ({amountNum} CAD) exceeds the per-person limit ({mealLimitCad} CAD × {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}). This claim will require manager review.
            </div>
          )}

          {policy.blocks.length > 0 && (
            <div className="form-policy form-policy-blocks">
              <strong>Cannot submit:</strong> {policy.blocks.join(" ")}
            </div>
          )}
          {policy.warnings.length > 0 && (
            <div className="form-policy form-policy-warnings">
              {policy.warnings.join(" ")}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn btn-secondary"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="btn btn-primary"
            >
              {saving ? "Submitting…" : "Submit claim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

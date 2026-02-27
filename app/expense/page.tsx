"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExpenseType = "Meal" | "Taxi/Rideshare" | "Parking" | "Hotel" | "Other";
type Currency = "CAD" | "USD" | "EUR" | "GBP";

const CATEGORIES: ExpenseType[] = ["Meal", "Taxi/Rideshare", "Parking", "Hotel", "Other"];
const CURRENCIES: Currency[] = ["CAD", "USD", "EUR", "GBP"];

function formatMoney(amount: string, currency: Currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet/30",
    hasError && "border-red-300 focus:ring-red-200"
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        {error && <div className="text-xs font-medium text-red-600">{error}</div>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  emphasis,
  right,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
  right?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-500">{label}</div>
      <div
        className={cn(
          "truncate text-slate-900",
          right && "text-right",
          mono && "font-mono text-xs",
          emphasis && "font-semibold"
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
}) {
  return (
    <label className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-violet focus:ring-violet/30"
      />
      <div className="min-w-0">
        <div className="text-sm text-slate-800">{label}</div>
        {error && <div className="mt-1 text-xs font-medium text-red-600">{error}</div>}
      </div>
    </label>
  );
}

export default function VisitExpenseSubmitPage() {
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [visitId, setVisitId] = useState("VIS-2026-0218-0042");
  const [hcpName, setHcpName] = useState("Dr. Patel");
  const [location, setLocation] = useState("Toronto, ON");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseType>("Meal");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [attendees, setAttendees] = useState([{ name: "Dr. Patel", role: "HCP" }]);
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const [confirmBusinessPurpose, setConfirmBusinessPurpose] = useState(false);
  const [confirmNoAlcohol, setConfirmNoAlcohol] = useState(true);
  const [confirmPolicy, setConfirmPolicy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ref: string; ts: string } | null>(null);

  const prettyTotal = useMemo(() => formatMoney(amount, currency), [amount, currency]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!visitId.trim()) e.visitId = "Visit ID is required.";
    if (!hcpName.trim()) e.hcpName = "HCP name is required.";
    if (!date) e.date = "Date is required.";
    if (!amount || !(Number(amount) > 0)) e.amount = "Enter a valid amount greater than 0.";
    if (!merchant.trim()) e.merchant = "Merchant / vendor is required.";
    if (!receipt) e.receipt = "Receipt is required (photo or PDF).";
    if (!confirmBusinessPurpose) e.business = "Confirm this expense is business-related.";
    if (!confirmPolicy) e.policy = "Confirm it complies with policy & local limits.";
    return e;
  }, [visitId, hcpName, date, amount, merchant, receipt, confirmBusinessPurpose, confirmPolicy]);

  const isValid = Object.keys(errors).length === 0;

  const addAttendee = () => {
    setAttendees((prev) => [...prev, { name: "", role: "" }]);
  };

  const removeAttendee = (idx: number) => {
    setAttendees((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAttendee = (idx: number, key: "name" | "role", val: string) => {
    setAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, [key]: val } : a)));
  };

  const onSubmit = async () => {
    setSubmitted(null);
    if (!isValid) return;

    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 900));

      const ref = `EXP-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Date.now()
        .toString()
        .slice(-4)}`;

      setSubmitted({ ref, ts: new Date().toLocaleString() });

      setAmount("");
      setMerchant("");
      setNotes("");
      setReceipt(null);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
      setConfirmBusinessPurpose(false);
      setConfirmPolicy(false);
      setConfirmNoAlcohol(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-lavender via-white to-violet/20 p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-violet" />
              Visit Expense Submission
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Submit meal/expense claim
              </h1>
              <p className="text-sm text-slate-600">
                Attach receipt, capture attendees, and confirm policy checks for a compliant submission.
              </p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" type="button">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {submitted && (
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-slate-900">Submitted successfully</div>
              <div className="text-sm text-slate-600">
                Reference: <span className="font-mono text-slate-900">{submitted.ref}</span> • {submitted.ts}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Visit ID" error={errors.visitId}>
                <input
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  className={inputClass(!!errors.visitId)}
                  placeholder="VIS-YYYY-MMDD-XXXX"
                />
              </Field>

              <Field label="Date of expense" error={errors.date}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass(!!errors.date)}
                />
              </Field>

              <Field label="HCP" error={errors.hcpName}>
                <input
                  value={hcpName}
                  onChange={(e) => setHcpName(e.target.value)}
                  className={inputClass(!!errors.hcpName)}
                  placeholder="e.g., Dr. Patel"
                />
              </Field>

              <Field label="Location (optional)">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass(false)}
                  placeholder="City, Province"
                />
              </Field>

              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseType)}
                  className={inputClass(false)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-[1fr_0.7fr] gap-3">
                <Field label="Amount" error={errors.amount}>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    className={inputClass(!!errors.amount)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Currency">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className={inputClass(false)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Merchant / Vendor" error={errors.merchant}>
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className={inputClass(!!errors.merchant)}
                  placeholder="e.g., The Keg / Uber / Green P"
                />
              </Field>

              <Field label="Receipt" error={errors.receipt}>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-violet px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-violet/40">
                    Upload
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-700">
                      {receipt ? receipt.name : "No file selected"}
                    </div>
                    <div className="text-xs text-slate-500">JPG/PNG/PDF • max size depends on policy</div>
                  </div>
                </div>
              </Field>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Attendees</div>
                  <div className="text-xs text-slate-500">
                    Record who attended (HCP, clinic staff, colleague). Keep it factual.
                  </div>
                </div>
                <Button type="button" size="sm" onClick={addAttendee}>
                  Add attendee
                </Button>
              </div>

              <div className="space-y-3">
                {attendees.map((a, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 md:grid-cols-[1fr_0.7fr_auto]"
                  >
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-600">Name</div>
                      <input
                        value={a.name}
                        onChange={(e) => updateAttendee(idx, "name", e.target.value)}
                        className={inputClass(false)}
                        placeholder="e.g., Dr. Patel"
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-600">Role</div>
                      <input
                        value={a.role}
                        onChange={(e) => updateAttendee(idx, "role", e.target.value)}
                        className={inputClass(false)}
                        placeholder="HCP / Nurse / Rep"
                      />
                    </div>
                    <div className="flex sm:items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => removeAttendee(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-1 text-sm font-semibold text-slate-900">Notes (optional)</div>
              <div className="mb-2 text-xs text-slate-500">
                Keep it short: business purpose, context, anything an auditor would need.
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(
                  "min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
                  "focus:outline-none focus:ring-2 focus:ring-violet/30"
                )}
                placeholder="e.g., Lunch during product discussion following clinic visit…"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">Claim summary</div>

              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Visit" value={visitId || "—"} mono />
                <SummaryRow label="HCP" value={hcpName || "—"} />
                <SummaryRow label="Location" value={location || "—"} />
                <SummaryRow label="Date" value={date || "—"} mono />
                <SummaryRow label="Category" value={category} />
                <SummaryRow label="Total" value={prettyTotal || "—"} emphasis right />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <div className="mb-2 text-xs font-medium text-slate-600">Receipt</div>
                <div className="truncate text-sm text-slate-700">
                  {receipt ? receipt.name : "Not attached"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">Compliance checks</div>
              <div className="mt-1 text-xs text-slate-500">
                These confirmations help ensure policy-aligned submissions.
              </div>

              <div className="mt-4 space-y-3">
                <CheckRow
                  checked={confirmBusinessPurpose}
                  onChange={setConfirmBusinessPurpose}
                  label="This expense was for a legitimate business purpose tied to the visit."
                  error={errors.business}
                />
                <CheckRow
                  checked={confirmNoAlcohol}
                  onChange={setConfirmNoAlcohol}
                  label="No alcohol was purchased (or it has been excluded per policy)."
                />
                <CheckRow
                  checked={confirmPolicy}
                  onChange={setConfirmPolicy}
                  label="The amount and attendee list comply with local limits and company policy."
                  error={errors.policy}
                />
              </div>

              <div className="mt-5">
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!isValid || submitting}
                  className="w-full rounded-2xl py-3"
                >
                  {submitting ? "Submitting…" : "Submit claim"}
                </Button>

                {!isValid && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-black/5">
                    <div className="mb-1 font-medium text-slate-700">Fix required fields:</div>
                    <ul className="list-disc space-y-1 pl-5">
                      {Object.values(errors).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white/60 p-4 text-xs text-slate-600 ring-1 ring-black/5 backdrop-blur">
              <div className="font-medium text-slate-700">Tip</div>
              <div className="mt-1">
                In production, you’d auto-populate visit details from CRM, enforce country-specific limits,
                and route high-risk claims for manager approval.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

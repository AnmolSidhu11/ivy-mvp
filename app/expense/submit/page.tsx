"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useVisitsStore } from "@/lib/store";

const CLAIMS_KEY = "expense-demo:claims";

const inputClass =
  "h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900";
const textareaClass =
  "min-h-[80px] w-full rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-900";
const labelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-500";

const CATEGORIES = ["Meals", "Travel", "Lodging", "Materials", "Other"];
const CURRENCIES = ["EUR", "USD", "GBP"];

export default function ExpenseSubmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visits } = useVisitsStore();

  const submitCountRef = useRef(0);

  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [visitId, setVisitId] = useState("");
  const [date, setDate] = useState("");
  const [hcpName, setHcpName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [merchant, setMerchant] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [complianceAck, setComplianceAck] = useState(false);
  const [compliancePolicy, setCompliancePolicy] = useState(false);

  const dateFromParams = searchParams.get("date") ?? "";
  const visitIdFromParams = searchParams.get("visitId") ?? "";

  useEffect(() => {
    if (dateFromParams && /^\d{4}-\d{2}-\d{2}$/.test(dateFromParams)) {
      queueMicrotask(() => setDate(dateFromParams));
    }
    if (visitIdFromParams) {
      queueMicrotask(() => setVisitId(visitIdFromParams));
      const v = visits.find((x) => x.id === visitIdFromParams);
      if (v?.hcpName) queueMicrotask(() => setHcpName(v.hcpName));
    }
  }, [dateFromParams, visitIdFromParams, visits]);

  const resetForm = useCallback(() => {
    setVisitId("");
    setDate("");
    setHcpName("");
    setLocation("");
    setCategory("");
    setAmount("");
    setCurrency("EUR");
    setMerchant("");
    setReceiptFile(null);
    setAttendees("");
    setNotes("");
    setComplianceAck(false);
    setCompliancePolicy(false);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const dateYmd = date.trim() || new Date().toISOString().slice(0, 10);
      submitCountRef.current += 1;
      const shortId = String(submitCountRef.current).padStart(2, "0");
      const ref = `EXP-${dateYmd}-${shortId}`;
      const dateIso = new Date().toISOString();

      try {
        let list: { id: string; visitId?: string; status: string; updatedAt: string }[] = [];
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(CLAIMS_KEY) : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as unknown[];
            if (Array.isArray(parsed)) {
              list = parsed.filter(
                (c): c is { id: string; visitId?: string; status: string; updatedAt: string } =>
                  c != null &&
                  typeof c === "object" &&
                  typeof (c as { id?: string }).id === "string" &&
                  typeof (c as { updatedAt?: string }).updatedAt === "string"
              );
            }
          } catch {
            list = [];
          }
        }
        list.push({
          id: ref,
          visitId: visitId.trim() || undefined,
          status: "Draft",
          updatedAt: dateIso,
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CLAIMS_KEY, JSON.stringify(list));
        }
      } catch {
        // ignore
      }

      setSuccessRef(ref);
      resetForm();
    },
    [date, visitId, resetForm]
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-lavender via-white to-violet/20 p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Submit expense
            </h1>
            <p className="text-sm text-slate-600">
              Submit a new expense claim. It will appear in expense history as Draft.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
            <Link href="/expense">
              <Button variant="outline" size="sm">
                Back to expense history
              </Button>
            </Link>
          </div>
        </div>

        {successRef && (
          <Card className="mb-6 rounded-2xl border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-sm font-medium text-emerald-800">
              Expense submitted. Reference: <span className="font-mono">{successRef}</span>
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              It has been saved as Draft and will appear in expense history.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-emerald-300 text-emerald-800"
              onClick={() => setSuccessRef(null)}
            >
              Dismiss
            </Button>
          </Card>
        )}

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Expense details</CardTitle>
            <CardDescription>Fill in the form and submit. Receipt upload is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>Visit ID</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>HCP</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={hcpName}
                    onChange={(e) => setHcpName(e.target.value)}
                    placeholder="Healthcare professional name"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. City, venue"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>Category</label>
                  <select
                    className={cn(inputClass, "cursor-pointer")}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Currency</label>
                  <select
                    className={cn(inputClass, "cursor-pointer")}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Merchant</label>
                <input
                  type="text"
                  className={inputClass}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Merchant or vendor name"
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Receipt upload</label>
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    {receiptFile ? receiptFile.name : "Choose file"}
                  </span>
                </label>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Attendees</label>
                <input
                  type="text"
                  className={inputClass}
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="Comma-separated names"
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Notes</label>
                <textarea
                  className={textareaClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                <p className={cn(labelClass, "mb-2")}>Compliance</p>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={complianceAck}
                    onCheckedChange={(v) => setComplianceAck(v === true)}
                  />
                  <span className="text-xs text-zinc-700">
                    I confirm this expense is compliant with company policy.
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={compliancePolicy}
                    onCheckedChange={(v) => setCompliancePolicy(v === true)}
                  />
                  <span className="text-xs text-zinc-700">
                    I have read and accept the expense policy.
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-violet hover:bg-violet/90"
                >
                  Submit expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                >
                  Clear form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

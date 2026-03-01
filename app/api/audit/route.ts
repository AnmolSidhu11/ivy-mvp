import { NextResponse } from "next/server";
import { listAuditByDate } from "@/lib/concierge/audit";

/**
 * GET /api/audit?date=YYYY-MM-DD
 * Returns Concierge agent audit entries for the given date (Calendar Day Summary).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Query param date required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  const entries = listAuditByDate(date);
  return NextResponse.json({ date, entries });
}

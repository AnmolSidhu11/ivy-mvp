import { NextResponse, type NextRequest } from "next/server";
import { sanitizeText, checkForPhi } from "@/lib/conciergeSanitize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitId = searchParams.get("visitId") ?? "";
  const cleanedVisitId = sanitizeText(visitId);

  const phiError = checkForPhi(visitId);
  if (phiError) {
    return NextResponse.json({ error: phiError }, { status: 400 });
  }

  const objectives = [
    `Confirm objectives for visit ${cleanedVisitId || "today"}.`,
    "Align on what success looks like for the interaction.",
  ];

  const likelyQuestions = [
    "What has changed since our last discussion?",
    "Are there new access, workflow, or education gaps?",
  ];

  const keyMessages = [
    "Stay within approved indications and materials.",
    "Focus on logistics, access, and support—not clinical advice.",
  ];

  const complianceReminders = [
    "Do not discuss individual patient cases or PHI.",
    "Use only approved claims and resources.",
  ];

  return NextResponse.json({
    objectives,
    likelyQuestions,
    keyMessages,
    complianceReminders,
    disclaimer: "Draft – confirm with internal sources.",
  });
}


import { NextResponse } from "next/server";
import { sanitizeText, checkForPhi } from "@/lib/conciergeSanitize";

type PostcallBody = {
  visitId?: string;
  transcriptText?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as PostcallBody;
  const visitId = body.visitId ?? "";
  const transcript = body.transcriptText ?? "";

  const phiError = checkForPhi(transcript);
  if (phiError) {
    return NextResponse.json({ error: phiError }, { status: 400 });
  }

  const cleanedTranscript = sanitizeText(transcript);
  const cleanedVisitId = sanitizeText(visitId);

  const summary =
    cleanedTranscript.trim().length === 0
      ? "Draft summary based on call notes. Add key details before saving."
      : `Draft summary (sanitized): ${cleanedTranscript.slice(0, 280)}${
          cleanedTranscript.length > 280 ? "…" : ""
        }`;

  const objections = [
    "Capture any concerns about access, workflow, or education gaps.",
    "Note questions that require follow-up or routing to Medical Information.",
  ];

  const nextSteps = [
    "Confirm any materials or follow-ups you committed to send.",
    "Schedule an appropriate next touchpoint if needed.",
  ];

  const actionItems = [
    {
      text: `Log visit ${cleanedVisitId || "today"} in CRM and file this summary as a draft.`,
      dueDateYmd: undefined,
    },
  ];

  return NextResponse.json({
    summary,
    objections,
    nextSteps,
    actionItems,
  });
}


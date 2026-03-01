import { NextResponse } from "next/server";
import { checkForPhi } from "@/lib/conciergeSanitize";
import { lookupFaq, FAQ_CATEGORIES, type FaqCategory } from "@/lib/conciergeFaq";

type AskBody = {
  question?: string;
};

/**
 * POST /api/concierge/ask
 * Deterministic Q&A from local FAQ. No external calls.
 * Returns 400 if question contains PHI-like content.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as AskBody;
  const question = typeof body.question === "string" ? body.question.trim() : "";

  const phiError = checkForPhi(question);
  if (phiError) {
    return NextResponse.json({ error: phiError }, { status: 400 });
  }

  const { answer, category } = lookupFaq(question);

  return NextResponse.json({
    answer,
    category,
    categoryLabel: FAQ_CATEGORIES[category as FaqCategory],
  });
}

import { NextResponse } from "next/server";
import { sanitizeText, checkForPhi } from "@/lib/conciergeSanitize";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  context?: string;
  messages: ChatMessage[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const context = body.context ?? "";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const combined = [context, ...messages.map((m) => m.content)].join("\n");
  const phiError = checkForPhi(combined);
  if (phiError) {
    return NextResponse.json({ error: phiError }, { status: 400 });
  }

  const sanitized = sanitizeText(combined);
  const snippet = sanitized.trim().slice(0, 400);

  const assistantText =
    "Draft-only concierge response. Review and edit before sharing:\n\n" +
    (snippet || "Provide clear, factual notes from your interaction here.");

  return NextResponse.json({ assistantText });
}


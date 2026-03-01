import { NextResponse } from "next/server";
import type { OrchestratorRequest } from "@/lib/concierge/types";
import { runOrchestrator } from "@/lib/concierge/orchestrator";

/**
 * POST /api/concierge/run
 * Internal-only: no external API calls. Runs the Concierge orchestrator.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrchestratorRequest;
    const { task, context, userInput } = body;
    if (!task || !context || typeof context !== "object") {
      return NextResponse.json(
        { error: "Missing task or context" },
        { status: 400 }
      );
    }
    const response = runOrchestrator({ task, context, userInput });
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Orchestrator error",
      },
      { status: 500 }
    );
  }
}

import type { ClaimsRepo } from "../repos/ClaimsRepo";
import { runPipeline } from "./pipelineSimulator";

export type PipelineMode = "simulated" | "snowflake";

export interface PipelineRunner {
  run(claimId: string): Promise<void>;
}

/**
 * Runs the pipeline locally using the existing runPipeline(claimId, repo).
 */
export class SimulatedPipelineRunner implements PipelineRunner {
  private readonly repo: ClaimsRepo;

  constructor(repo: ClaimsRepo) {
    this.repo = repo;
  }

  async run(claimId: string): Promise<void> {
    await runPipeline(claimId, this.repo);
  }
}

/**
 * Returns a PipelineRunner for the given mode.
 * local/adls -> simulated. snowflake -> simulated for now (TODO: call backend later).
 */
export function getPipelineRunner(mode: "local" | "adls" | "snowflake", repo: ClaimsRepo): PipelineRunner {
  if (mode === "snowflake") {
    // TODO: call backend pipeline when Snowflake runner is implemented; for now use simulated
    return new SimulatedPipelineRunner(repo);
  }
  return new SimulatedPipelineRunner(repo);
}

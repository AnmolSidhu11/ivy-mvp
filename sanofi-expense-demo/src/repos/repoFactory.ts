import type { ClaimsRepo } from "./ClaimsRepo";
import { LocalStorageRepo } from "./LocalStorageRepo";

export type StorageMode = "local" | "adls" | "snowflake";

/**
 * Returns the claims repo for the given storage mode.
 * Config is optional and used when mode is adls (ADLSConfig) or snowflake (future).
 */
export function getRepo(mode: StorageMode, _config?: unknown): ClaimsRepo {
  switch (mode) {
    case "local":
      return LocalStorageRepo;
    case "adls":
      // TODO: return createADLSRepo(config as ADLSConfig) when wiring ADLS via factory
      return LocalStorageRepo;
    case "snowflake":
      // TODO: return createSnowflakeRepo(config) when Snowflake repo is implemented
      return LocalStorageRepo;
    default:
      return LocalStorageRepo;
  }
}

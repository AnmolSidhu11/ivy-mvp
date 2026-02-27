/* eslint-disable react-refresh/only-export-components -- useRepo is a hook exported from the same file as RepoProvider */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ClaimsRepo } from "../repos/ClaimsRepo";
import type { StorageMode } from "../repos/repoFactory";
import { getRepo } from "../repos/repoFactory";
import type { PipelineRunner } from "../policy/pipelineRunner";
import { getPipelineRunner } from "../policy/pipelineRunner";
import type { ADLSConfig } from "../types";

const MODE_KEY = "expense_demo_storage_mode";
const ADLS_STORAGE_KEY = "sanofi-expense-demo:storage";
const DEFAULT_CONFIG: ADLSConfig = {
  adlsSasBaseUrl: "",
  containerName: "",
  prefix: "",
};

function loadMode(): StorageMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "local" || raw === "adls" || raw === "snowflake") return raw;
    const legacy = localStorage.getItem(ADLS_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { mode?: string };
      if (parsed.mode === "ADLS") return "adls";
      if (parsed.mode === "Local") return "local";
    }
    return "local";
  } catch {
    return "local";
  }
}

function loadAdls(): ADLSConfig {
  try {
    const raw = localStorage.getItem(ADLS_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as { adls?: Partial<ADLSConfig> };
    return { ...DEFAULT_CONFIG, ...parsed.adls };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function loadStorage(): { mode: StorageMode; adls: ADLSConfig } {
  return { mode: loadMode(), adls: loadAdls() };
}

function saveMode(mode: StorageMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function saveAdls(adls: ADLSConfig) {
  try {
    localStorage.setItem(ADLS_STORAGE_KEY, JSON.stringify({ adls }));
  } catch {
    /* ignore */
  }
}

type RepoContextValue = {
  repo: ClaimsRepo;
  pipelineRunner: PipelineRunner;
  storageMode: StorageMode;
  adlsConfig: ADLSConfig;
  setStorageMode: (mode: StorageMode) => void;
  setAdlsConfig: (config: Partial<ADLSConfig>) => void;
};

const RepoContext = createContext<RepoContextValue | null>(null);

export function RepoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadStorage);

  const setStorageMode = useCallback((mode: StorageMode) => {
    saveMode(mode);
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setAdlsConfig = useCallback((config: Partial<ADLSConfig>) => {
    setState((prev) => {
      const adls = { ...prev.adls, ...config };
      saveAdls(adls);
      return { ...prev, adls };
    });
  }, []);

  const repo = useMemo(
    (): ClaimsRepo => getRepo(state.mode, state.adls),
    [state.mode, state.adls]
  );

  // local/adls -> simulated runner; snowflake -> simulated for now (TODO: call backend later)
  const pipelineRunner = useMemo(
    (): PipelineRunner => getPipelineRunner(state.mode, repo),
    [state.mode, repo]
  );

  const value = useMemo<RepoContextValue>(
    () => ({
      repo,
      pipelineRunner,
      storageMode: state.mode,
      adlsConfig: state.adls,
      setStorageMode,
      setAdlsConfig,
    }),
    [repo, pipelineRunner, state.mode, state.adls, setStorageMode, setAdlsConfig]
  );

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used within RepoProvider");
  return ctx;
}

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ClaimsRepo } from "../repos/ClaimsRepo";
import type { StorageMode, ADLSConfig } from "../types";
import { LocalStorageRepo } from "../repos/LocalStorageRepo";
import { createADLSRepo } from "../repos/ADLSRepo";
import { seedIfNeeded } from "../data/seed";

type RepoContextValue = {
  repo: ClaimsRepo;
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  adlsConfig: ADLSConfig;
  setAdlsConfig: (c: Partial<ADLSConfig>) => void;
  refreshRepo: () => void;
};

const ADLS_CONFIG_KEY = "expense-claims:adls-config";

const defaultADLS: ADLSConfig = {
  sasBaseUrl: "",
  containerName: "",
  prefix: "",
};

function loadADLSConfig(): ADLSConfig {
  try {
    const raw = localStorage.getItem(ADLS_CONFIG_KEY);
    if (!raw) return defaultADLS;
    const parsed = JSON.parse(raw) as Partial<ADLSConfig>;
    return { ...defaultADLS, ...parsed };
  } catch {
    return defaultADLS;
  }
}

const RepoContext = createContext<RepoContextValue | null>(null);

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [storageMode, setStorageMode] = useState<StorageMode>("Local");
  const [adlsConfig, setAdlsConfigState] = useState<ADLSConfig>(loadADLSConfig);
  const [seed] = useState(() => seedIfNeeded());
  const setAdlsConfig = useCallback((c: Partial<ADLSConfig>) => {
    setAdlsConfigState((prev) => {
      const next = { ...prev, ...c };
      try {
        localStorage.setItem(ADLS_CONFIG_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const repo = useMemo((): ClaimsRepo => {
    if (storageMode === "ADLS" && adlsConfig.sasBaseUrl && adlsConfig.containerName) {
      return createADLSRepo(adlsConfig, seed.visits);
    }
    return LocalStorageRepo;
  }, [storageMode, adlsConfig.sasBaseUrl, adlsConfig.containerName, adlsConfig.prefix, seed.visits]);

  const refreshRepo = useCallback(() => {}, []);

  const value = useMemo<RepoContextValue>(
    () => ({ repo, storageMode, setStorageMode, adlsConfig, setAdlsConfig, refreshRepo }),
    [repo, storageMode, adlsConfig, setAdlsConfig, refreshRepo]
  );

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used within RepoProvider");
  return ctx;
}

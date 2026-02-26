import React, { useEffect } from "react";
import type { ADLSConfig } from "../types";
import { cn } from "../utils/cn";

export function ADLSConfigDrawer({
  open,
  onClose,
  config,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  config: ADLSConfig;
  onSave: (c: ADLSConfig) => void;
}) {
  const [sas, setSas] = React.useState(config.sasBaseUrl);
  const [container, setContainer] = React.useState(config.containerName);
  const [prefix, setPrefix] = React.useState(config.prefix);

  useEffect(() => {
    if (open) {
      setSas(config.sasBaseUrl);
      setContainer(config.containerName);
      setPrefix(config.prefix);
    }
  }, [open, config.sasBaseUrl, config.containerName, config.prefix]);

  const handleSave = () => {
    onSave({ sasBaseUrl: sas, containerName: container, prefix });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-xl">
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">ADLS Config</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            SAS base URL (e.g. https://account.blob.core.windows.net?sv=...&sig=...). No auth flows; single SAS only.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">SAS base URL</label>
              <input
                type="text"
                value={sas}
                onChange={(e) => setSas(e.target.value)}
                placeholder="https://...?sv=..."
                className={cn(
                  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-violet/30"
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Container name</label>
              <input
                type="text"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                placeholder="claims"
                className={cn(
                  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-violet/30"
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Path prefix (optional)</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="prod or leave empty"
                className={cn(
                  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-violet/30"
                )}
              />
            </div>
          </div>
          <div className="mt-auto flex gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-violet py-2 text-sm font-medium text-white hover:bg-violet-hover"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

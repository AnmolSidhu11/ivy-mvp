import { useEffect, useState } from "react";
import type { StorageMode } from "../repos/repoFactory";
import type { ADLSConfig } from "../types";
import "./SettingsDrawer.css";

type Props = {
  open: boolean;
  onClose: () => void;
  storageMode: StorageMode;
  adlsConfig: ADLSConfig;
  onSave: (mode: StorageMode, config: ADLSConfig) => void;
};

export function SettingsDrawer({ open, onClose, storageMode, adlsConfig, onSave }: Props) {
  const [mode, setMode] = useState<StorageMode>(storageMode);
  const [sasBaseUrl, setSasBaseUrl] = useState(adlsConfig.adlsSasBaseUrl);
  const [containerName, setContainerName] = useState(adlsConfig.containerName);
  const [prefix, setPrefix] = useState(adlsConfig.prefix);

  useEffect(() => {
    if (open) {
      setMode(storageMode);
      setSasBaseUrl(adlsConfig.adlsSasBaseUrl);
      setContainerName(adlsConfig.containerName);
      setPrefix(adlsConfig.prefix);
    }
  }, [open, storageMode, adlsConfig.adlsSasBaseUrl, adlsConfig.containerName, adlsConfig.prefix]);

  const handleSave = () => {
    onSave(mode, {
      adlsSasBaseUrl: sasBaseUrl,
      containerName: containerName,
      prefix: prefix,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="settings-drawer-overlay" onClick={onClose} aria-hidden />
      <div className="settings-drawer" role="dialog" aria-labelledby="settings-drawer-title">
        <div className="settings-drawer-header">
          <h2 id="settings-drawer-title">Settings</h2>
          <button type="button" onClick={onClose} className="settings-drawer-close" aria-label="Close">
            ×
          </button>
        </div>
        <div className="settings-drawer-body">
          <div className="settings-field">
            <label>Storage mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as StorageMode)} className="settings-input">
              <option value="local">Local</option>
              <option value="adls">ADLS (Simulated)</option>
              <option value="snowflake">Snowflake (Coming Soon)</option>
            </select>
          </div>
          <div className="settings-field">
            <label>SAS base URL</label>
            <input
              type="text"
              value={sasBaseUrl}
              onChange={(e) => setSasBaseUrl(e.target.value)}
              placeholder="https://account.blob.core.windows.net?sv=...&sig=..."
              className="settings-input"
            />
          </div>
          <div className="settings-field">
            <label>Container name</label>
            <input
              type="text"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="claims"
              className="settings-input"
            />
          </div>
          <div className="settings-field">
            <label>Prefix (optional)</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. prod"
              className="settings-input"
            />
          </div>
        </div>
        <div className="settings-drawer-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </>
  );
}

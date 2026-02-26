import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { seed } from "./data/seed";
import { RepoProvider, useRepo } from "./context/RepoContext";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { PolicySettingsDrawer } from "./components/PolicySettingsDrawer";
import { Dashboard } from "./pages/Dashboard";
import { CreateClaim } from "./pages/CreateClaim";
import { ClaimDetail } from "./pages/ClaimDetail";
import { VisitDetail } from "./pages/VisitDetail";
import { Calendar } from "./pages/Calendar";
import type { StorageMode } from "./repos/repoFactory";
import type { ADLSConfig } from "./types";
import "./App.css";

const MODE_LABELS: Record<StorageMode, string> = {
  local: "Local",
  adls: "ADLS (Simulated)",
  snowflake: "Snowflake (Coming Soon)",
};

function Nav({ onOpenSettings, onOpenPolicy }: { onOpenSettings: () => void; onOpenPolicy: () => void }) {
  const loc = useLocation();
  const { storageMode } = useRepo();
  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <Link to="/" className={loc.pathname === "/" ? "active" : ""}>
          Claims
        </Link>
        <Link to="/create" className={loc.pathname === "/create" ? "active" : ""}>
          Create Claim
        </Link>
        <Link to="/calendar" className={loc.pathname === "/calendar" ? "active" : ""}>
          Calendar
        </Link>
        <span className="app-nav-storage">
          Mode: <strong>{MODE_LABELS[storageMode]}</strong>
        </span>
        <button type="button" onClick={onOpenPolicy} className="app-nav-settings-btn">
          Policy
        </button>
        <button type="button" onClick={onOpenSettings} className="app-nav-settings-btn">
          Settings
        </button>
      </div>
    </nav>
  );
}

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const { repo, storageMode, setStorageMode, adlsConfig, setAdlsConfig } = useRepo();

  useEffect(() => {
    seed();
    repo.listClaims().then((list) => {
      console.log("listClaims()", list);
    });
  }, [repo]);

  const handleSettingsSave = (mode: StorageMode, config: ADLSConfig) => {
    setStorageMode(mode);
    setAdlsConfig(config);
  };

  return (
    <>
      <Nav onOpenSettings={() => setSettingsOpen(true)} onOpenPolicy={() => setPolicyOpen(true)} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateClaim />} />
        <Route path="/claim/:id" element={<ClaimDetail />} />
        <Route path="/visit/:id" element={<VisitDetail />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        storageMode={storageMode}
        adlsConfig={adlsConfig}
        onSave={handleSettingsSave}
      />
      <PolicySettingsDrawer open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RepoProvider>
        <div className="app-shell">
          <AppContent />
        </div>
      </RepoProvider>
    </BrowserRouter>
  );
}

export default App;

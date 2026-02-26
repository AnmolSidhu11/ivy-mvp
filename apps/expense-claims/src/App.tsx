/**
 * Visit Expense Claims — standalone mini app (ADLS/ADF-style).
 *
 * Storage mode:
 * - Local: uses localStorage (default). Synthetic data is seeded on first load.
 * - ADLS: uses Azure Data Lake Storage Gen2 (Blob with hierarchical namespace).
 *   Configure via "ADLS Config" drawer: SAS base URL (e.g. https://account.blob.core.windows.net?sv=...&sig=...),
 *   container name, and optional path prefix. No auth flows; single SAS only.
 *
 * Toggle "Storage Mode" in the header to switch. When ADLS is selected and config is set,
 * claims are written to raw/claims/{id}/claim.json and gold/claims_current/{id}.json;
 * receipt files to raw/receipts/{id}/{fileName}. Listing uses a local index when in ADLS mode.
 */

import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RepoProvider, useRepo } from "./context/RepoContext";
import { Layout } from "./components/Layout";
import { ADLSConfigDrawer } from "./components/ADLSConfigDrawer";
import { Dashboard } from "./pages/Dashboard";
import { ClaimDetail } from "./pages/ClaimDetail";
import { CreateClaimWizard } from "./pages/CreateClaimWizard";

function AppContent() {
  const { storageMode, setStorageMode, adlsConfig, setAdlsConfig } = useRepo();
  const [adlsDrawerOpen, setAdlsDrawerOpen] = useState(false);

  const toggleStorage = () => {
    setStorageMode(storageMode === "Local" ? "ADLS" : "Local");
  };

  return (
    <>
      <Layout
        storageMode={storageMode}
        onToggleStorage={toggleStorage}
        onOpenADLSConfig={() => setAdlsDrawerOpen(true)}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<CreateClaimWizard />} />
          <Route path="/claim/:id" element={<ClaimDetail />} />
          <Route path="/claim/:id/edit" element={<CreateClaimWizard />} />
        </Routes>
      </Layout>
      <ADLSConfigDrawer
        open={adlsDrawerOpen}
        onClose={() => setAdlsDrawerOpen(false)}
        config={adlsConfig}
        onSave={setAdlsConfig}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RepoProvider>
        <AppContent />
      </RepoProvider>
    </BrowserRouter>
  );
}

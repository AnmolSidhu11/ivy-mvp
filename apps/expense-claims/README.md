# Visit Expense Claims (standalone mini app)

Enterprise pharma sales-rep expense workflow with **Local** (default) or **ADLS** persistence.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the port Vite prints).

## Storage mode

- **Local**: Uses `localStorage`. Synthetic data (6 visits, 8 claims) is seeded on first load.
- **ADLS**: Uses Azure Data Lake Storage Gen2 (Blob with hierarchical namespace). Set via header **Storage Mode** → **ADLS**, then **ADLS Config**:
  - **SAS base URL**: e.g. `https://<account>.blob.core.windows.net?sv=...&sig=...`
  - **Container name**: e.g. `claims`
  - **Path prefix**: optional (e.g. `prod`)

No auth flows; single SAS only. Claims are written to `raw/claims/{claimId}/claim.json` and `gold/claims_current/{claimId}.json`; receipts to `raw/receipts/{claimId}/{fileName}`.

## Structure

- `src/types` — domain types (Visit, ExpenseClaim, etc.)
- `src/data` — seed + synthetic generators
- `src/policy` — policy engine (meal limit, HCP attendee, receipt, category Other)
- `src/repos` — `ClaimsRepo` interface, `LocalStorageRepo`, `ADLSRepo`
- `src/pages` — Dashboard, Claim Detail, Create Claim Wizard (3-step)
- `src/components` — Layout, StatusPill, Skeleton, ADLS Config drawer
- `src/context` — RepoProvider (storage mode + repo instance)

## Build

```bash
npm run build
```

Output in `dist/`.

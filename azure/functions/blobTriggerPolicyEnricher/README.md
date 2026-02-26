# Blob Trigger Policy Enricher

Minimal Azure Function (Node/TypeScript) that runs on **BlobCreated** and enriches claim data with policy evaluation, then writes silver, gold, and audit outputs.

## Trigger paths

- **Configured:** `raw/claims/{claimId}/claim.json`  
  When a claim JSON blob is created here, the function runs.
- **Optional (same logic):** To also trigger on receipt uploads, add a second function (or duplicate trigger binding) for `raw/receipts/{claimId}/{fileName}`; then read the claim from `raw/claims/{claimId}/claim.json` and run the same pipeline.

## Function logic

1. **Read** `claim.json` from the trigger blob (parse JSON).
2. **Evaluate policy** (same rules as app `policyEngine.ts`):
   - BLOCK: no receipt, businessPurpose false, policyConfirmed false, no HCP attendee.
   - WARNING + requiresReview: Meal > CAD 60/person, category Other.
3. **Write** `silver/claims/{claimId}/claim_enriched.json` (claim + policy + metadata).
4. **Write** `gold/claims_current/{claimId}.json` (current state; status set from policy).
5. **Write** `audit/claims/{claimId}.json` (JSON array of audit entries for this run).  
   For true append semantics (e.g. `.jsonl`), use an Append Blob and read-modify-write or a separate audit pipeline.

## Environment variables / app settings

- **`AzureWebJobsStorage`** (required)  
  Storage connection string used for:
  - Blob trigger (input)
  - Silver, gold, and audit blob outputs  

  Set in the Function App’s **Application settings** (or `local.settings.json` for local dev):

  ```json
  {
    "IsEncrypted": false,
    "Values": {
      "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<key>;EndpointSuffix=core.windows.net",
      "FUNCTIONS_WORKER_RUNTIME": "node"
    }
  }
  ```

  Use the same storage account (and container) as the app’s ADLS config so the function reads/writes the same paths.

## Build

From this folder:

```bash
npm install
npm run build
```

This compiles TypeScript to `index.js`, `policyEngine.js`, and `types.js`. The host uses `index.js` (see `function.json` → `scriptFile`).

## Deploy

1. Create a Function App (Node, LTS) and the same storage account/container as the app.
2. Set **Application settings** (e.g. `AzureWebJobsStorage`, `FUNCTIONS_WORKER_RUNTIME=node`).
3. Deploy this function (e.g. include this folder in the function app):

   - **Azure CLI:** From the function app root (parent of the function folder), run:
     ```bash
     func azure functionapp publish <FunctionAppName>
     ```
   - **VS Code:** Use the Azure Functions extension, right‑click the Function App → Deploy to Function App.
   - **CI/CD:** Use the same `func` publish or zip-deploy; ensure `npm run build` runs before packaging so `index.js` is present.

4. Ensure the function app’s **Blob trigger** uses the same container/path as where the app writes (e.g. `raw/claims/{claimId}/claim.json`).

## Event Grid subscription note

The function is invoked by the **Azure WebJobs Storage** blob trigger, which uses a blob-created event from the same storage account. You do **not** need a separate Event Grid subscription for this trigger.

If you later want a dedicated **Event Grid** subscription (e.g. to filter by path or push to a webhook), you would:

- Create an Event Grid subscription for the storage account, event type **Blob Created**.
- Filter the topic to the container (and optional path prefix).
- Set the handler to an HTTP-triggered function or another endpoint that then runs this logic (or reuses the same code path). The built-in blob trigger remains the minimal option for “run when a blob appears in this path.”

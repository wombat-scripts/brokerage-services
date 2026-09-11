# brokerage-services

Wombat Home Loans job bus for Opportunity Matrix work. Phase 1 scaffolds **one cell**: Prai × NAB valuation + pricing → Opportunity Run → Notion write-back.

This repo is separate from Amy’s `wombat-website`. No live NAB or CoreLogic portal scrape in this milestone.

## Layout

| Path | Role |
| --- | --- |
| `packages/contracts` | Job envelope, JobKind, ArtefactRef, AuditEvent, val/price/matrix I/O, Opportunity Run, FirmId (`wombat`), CRM + vault interfaces |
| `packages/notion-adapter` | `CrmWriteBackAdapter` for Notion. Fail closed. Cites `sourceRunId`. Never writes Loans **Interest Rate** |
| `packages/gcp-vault` | Vendor-agnostic `CredentialVault` behind a GCP Secret Manager adapter (fixture client in CI) |
| `packages/store` | Job store + append-only `opportunity_runs` (memory for tests; Postgres for runtime) |
| `apps/api` | Thin Hono API: firm-scoped Desk + jobs under `/v1/firms/:firmId`, plus wombat aliases `POST /jobs` and `GET /jobs/:jobId` |
| `apps/worker` | Processes jobs. `opportunity.matrix_cell` composes val + price and writes via adapters |
| `apps/web` | **Wombat Desk** Phase A ops console. Fixture book UI for Tom. See `apps/web/README.md` |
| `db/migrations` | SQL for `jobs` and `opportunity_runs` |

## Locked decisions

- `firm_id = wombat` on every job and run
- Opportunity Runs are **append-only** (void via `voided_at` + reason only)
- `pricing.lender` **requires** `valuationJobId` + `lvr` from **that lender’s** val (no generic 80%)
- Saving Yes is a **flag for Tom**, not advice and not an auto-email
- Current rate default is the **Notion loan row** (`currentRateSource: "notion_loan"`)
- Google Password Manager is **not** a runtime
- AU residency preferred for Postgres / workers / sessions; seats can live elsewhere

## Prerequisites

- Node 22
- pnpm 10 (`corepack enable`)
- Optional: Docker for local Postgres

```bash
cp .env.example .env
pnpm install
pnpm typecheck
pnpm test
```

Wombat Desk (ops UI, fixtures by default):

```bash
pnpm dev:web
```

Open http://localhost:3001 for the Desk tools hub, then `/matrix` for Prai × NAB Saving Yes. Set `DESK_API_BASE_URL=http://127.0.0.1:3000` to read Andre’s Phase 1.1 Desk API instead. Details: `apps/web/README.md`.

Local `pnpm test` uses the in-memory store, a mocked Notion adapter, and a fixture Secret Manager client. It does **not** need Postgres, GCP credentials, or a Notion token. CI starts a Postgres service, runs `pnpm migrate`, and fails if Desk list/get against Postgres regresses.

## How seats call a job

Seats import types from `@wombat/contracts` only, then `POST /v1/firms/wombat/jobs` (or the wombat alias `POST /jobs`). The API stamps `firmId: "wombat"`. Wrong firm → `404`. Create/complete audit always includes `firm_id` + requester.

When `DESK_API_KEY` is set, send `Authorization: Bearer …` or `X-Api-Key`. Unset = open local/fixture path (Amy’s curls stay valid).

```http
POST /v1/firms/wombat/jobs
Content-Type: application/json
```

```json
{
  "kind": "valuation.lender",
  "requestedBy": "seat:andre",
  "input": {
    "fixture": true,
    "lenderCode": "NAB",
    "address": {
      "line1": "15 Ashley Avenue",
      "suburb": "West Pennant Hills",
      "state": "NSW",
      "postcode": "2125"
    },
    "loanBalanceAud": 800000
  },
  "subjectRefs": {
    "propertyPageId": "notion-property-page-id"
  }
}
```

Poll status:

```http
GET /v1/firms/wombat/jobs/{jobId}
```

`GET /jobs/{jobId}` is a wombat-default alias.

Statuses: `queued` → `running` → `succeeded` | `failed` | `cancelled` | `awaiting_attended_mfa`.

Without `input.fixture=true` (or `PHASE1_FIXTURES=true`), lender jobs pause at `awaiting_attended_mfa`. There is no live portal login.

## Run the Prai × NAB fixture cell

Happy-path numbers (from Phase 0): loan **$800,000**, val **$1,025,000**, LVR **~0.78**, current **6.50%**, new **6.05%** → `savingFlag=yes`, `deltaBp=45`.

### Fastest: unit/integration test (CI)

```bash
pnpm test
```

This runs fixture `valuation.lender` + `pricing.lender` → `opportunity.matrix_cell` → Opportunity Run. Notion is mocked.

### Local API + inline worker (no Docker)

`.env` from `.env.example` already sets `PHASE1_FIXTURES=true`, `NOTION_DRY_RUN=true`, `INLINE_WORKER=true`.

```bash
pnpm --filter @wombat/api start
```

Then create jobs in order: valuation → pricing (pass `valuationJobId` + computed `lvr`) → matrix_cell (pass both child ids). Or call the compose helper from a seat/script:

```ts
import { createMemoryStore } from "@wombat/store";
import { DryRunCrmWriteBackAdapter } from "@wombat/notion-adapter";
import { runFixtureMatrixCell } from "@wombat/worker";

const { matrix } = await runFixtureMatrixCell(createMemoryStore(), new DryRunCrmWriteBackAdapter(), {
  requestedBy: "seat:andre",
  clientPageId: "client_prai",
  propertyPageId: "property_15_ashley",
  loanPageId: "loan_nab_800k",
});
```

### Local API + worker + Postgres

```bash
docker compose up -d
# DATABASE_URL=postgres://wombat:wombat@localhost:5432/brokerage
pnpm migrate
# terminal 1
INLINE_WORKER=false pnpm --filter @wombat/api start
# terminal 2
pnpm --filter @wombat/worker start
```

Memory store is process-local. Two processes **must** share Postgres.

## AU / host notes

Prefer **Australian** regions for:

- Postgres (job bus + `opportunity_runs` + audit) — Neon or Supabase **Sydney**
- GCP Secret Manager — user-managed replicas in **australia-southeast1** only
- Workers / browser runners (later)
- Encrypted Playwright `storageState`

Orchestrating seats can live elsewhere. Pin the job bus and artefacts to AU. This repo does not provision cloud resources.

Local Docker Postgres is **not** AU-resident; it is only for development. Local tests stay in-memory unless `DATABASE_URL` is set. CI always opens the service-container Postgres.

## GCP Secret Manager (CredentialVault)

Bitwarden Secrets Manager is cancelled. The Phase 0 `CredentialVault` interface stays vendor-agnostic; `packages/gcp-vault` is the adapter.

Locked vault (Tom/Matt 11 Sep 2026):

- Backend: GCP Secret Manager, **user-managed replication in `australia-southeast1` only** (not Automatic)
- Project ID: `wombat-brokerage-services`
- Project number: `709295017178`
- Org: wombathomeloans.com.au

Secret **names** (never commit values):

| Secret | Job kinds | Payload shape |
| --- | --- | --- |
| `wombat-nab-broker-portal` | `valuation.lender` / `pricing.lender` when `lenderCode=NAB` | `{ "username", "password", "totp_seed"? }` |
| `wombat-corelogic-property-hub` | `valuation.corelogic_avm` | `{ "portal": "corelogic_property_hub", "entry_email", "username", "password", "mfa_mode", "mfa_email_hint"? }` |

CoreLogic / Cotality flow (attended): email gate → Property Hub username/password → Ping email OTP. **Never store OTP codes.** `mfa_mode=email_attended` (or `attended` / `push`) surfaces job status `awaiting_attended_mfa`. When `totp_seed` is present the unlock status is `ready` (TOTP-managed). Do not log the seed. There is still **no live portal scrape**.

Worker auth:

- Prefer Application Default Credentials / workload identity on the AU host
- Interim: a service account with `roles/secretmanager.secretAccessor` only
- Optional `GOOGLE_APPLICATION_CREDENTIALS` = absolute path to that JSON for local/CI. **Do not commit the file or paste it in chat**
- `GCP_VAULT_MODE=fixture` (default, CI) uses an in-process mock client — no GCP network
- `GCP_VAULT_MODE=live` uses Secret Manager via ADC

Env: `GCP_PROJECT_ID`, `GCP_SECRET_NAB`, `GCP_SECRET_CORELOGIC`, optional `GCP_SECRET_LOCATION`, `GCP_VAULT_MODE`, `GOOGLE_APPLICATION_CREDENTIALS`.

Callers receive metadata only (`secretId`, `kind`, `mfaMode`, `usernameHint`). Passwords and totp seeds never enter job output, audit, or logs.

Google Password Manager stays an operator store, not a service backend. Passkeys remain a hard block for automation.

## Notion write-back

Adapter is the only job path that mutates CRM.

**Properties:** `Estimated Value`, `Value Date`, `Opportunity Status`, `Do This Next`, `Notes` (append `[brokerage-services run <sourceRunId> <date>]`). Do not invent Overall LVR.

**Loans:** merge `Opportunity Type` (`Reprice` / `Refinance` / `Retention review` as appropriate), `Opportunity Status`, `Do This Next`. **Never overwrite `Interest Rate`** from a competitor quote. Current rate is read from the Notion loan row until Tom says otherwise.

**Opportunity Runs:** append-only. Service store is Postgres (or the in-memory fixture store). Live Notion DB id is `54120476-0e40-4887-b457-0ff486ecb205` — set `NOTION_OPPORTUNITY_RUNS_DATABASE_ID`. Without token + DB id the adapter **fail-closes** and the job is `failed` / retryable. `NOTION_DRY_RUN=true` is local-only. The adapter maps Phase 0 run fields onto the live property names (Name, Run ID, firm_id, Client, Property, Loan, lenders, balances, val, LVR, rates, Saving Flag, deltas, job ids, Status, Requested By, Ran At, Notes). It never writes Loans **Interest Rate**.

## Desk read APIs (Amy)

Documented in [docs/desk-api.md](docs/desk-api.md). When Postgres is not configured the API seeds the Prai × NAB fixture (`01JPHASE11PRAI0001` + linked val/pricing/matrix jobs) so Desk can consume stable JSON without a Notion token.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/v1/firms/:firmId/opportunity-runs` | Optional `client`, `status` |
| `GET` | `/v1/firms/:firmId/opportunity-runs/:runId` | One run |
| `GET` | `/v1/firms/:firmId/jobs` | Optional `runId` |
| `GET` | `/v1/firms/:firmId/jobs/:jobId` | Full `Job` envelope |

`firmId` must be `wombat`. Other firms → `404` (not an empty list). Auth stub documented in `docs/desk-api.md`.

## Out of scope (Phase 1)

Live NAB/CoreLogic scrape · multi-lender matrix · `opportunity.book_scan` · multi-broker UI · Infynity / Metanoia / ApplyOnline · Sharp/Stryd clone · Amy’s website

# brokerage-services

Wombat Home Loans job bus for Opportunity Matrix work. Phase 1 scaffolds **one cell**: Prai × NAB valuation + pricing → Opportunity Run → Notion write-back.

This repo is separate from Amy’s `wombat-website`. No live NAB or CoreLogic portal scrape in this milestone.

## Layout

| Path | Role |
| --- | --- |
| `packages/contracts` | Job envelope, JobKind, ArtefactRef, AuditEvent, val/price/matrix I/O, Opportunity Run, FirmId (`wombat`), CRM + vault interfaces |
| `packages/notion-adapter` | `CrmWriteBackAdapter` for Notion. Fail closed. Cites `sourceRunId`. Never writes Loans **Interest Rate** |
| `packages/bitwarden-vault` | Vendor-agnostic `CredentialVault` behind a Bitwarden Secrets Manager / machine-account stub |
| `packages/store` | Job store + append-only `opportunity_runs` (memory for tests; Postgres for runtime) |
| `apps/api` | Thin Hono API: `POST /jobs`, `GET /jobs/:jobId`, plus Desk reads under `/v1/firms/:firmId` |
| `apps/worker` | Processes jobs. `opportunity.matrix_cell` composes val + price and writes via adapters |
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

Tests use the in-memory store and a mocked Notion adapter. They do **not** need Postgres, Bitwarden, or a Notion token.

## How seats call a job

Seats import types from `@wombat/contracts` only, then `POST /jobs`. The API stamps `firmId: "wombat"`.

```http
POST /jobs
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
GET /jobs/{jobId}
```

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
- Workers / browser runners (later)
- Encrypted Playwright `storageState`

Orchestrating seats can live elsewhere. Pin the job bus and artefacts to AU. This repo does not provision cloud resources.

Local Docker Postgres is **not** AU-resident; it is only for development. Tests do not open a database.

## Bitwarden Secrets Manager / machine accounts

Vault path (locked): Bitwarden cloud now → self-host Sydney later.

- Design against **Secrets Manager / machine accounts**
- Keep the `CredentialVault` interface vendor-agnostic (`packages/bitwarden-vault` is one adapter)
- Phase 1 runtime returns `awaiting_attended_mfa` until secrets exist
- **Never** log or commit secrets. `.env.example` is placeholders only
- Machine accounts and access tokens **do not migrate** on self-host — recreate them
- Google Password Manager stays an operator store, not a service backend
- SMS/email MFA stays attended. Passkeys are a hard block for automation

Required env (placeholders): `BITWARDEN_API_URL`, `BITWARDEN_ACCESS_TOKEN`, `BITWARDEN_ORGANIZATION_ID`, `BITWARDEN_PROJECT_ID`.

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

`firmId` must be `wombat`.

## Out of scope (Phase 1)

Live NAB/CoreLogic scrape · multi-lender matrix · `opportunity.book_scan` · multi-broker UI · Infynity / Metanoia / ApplyOnline · Sharp/Stryd clone · Amy’s website

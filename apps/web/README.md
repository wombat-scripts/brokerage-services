# Wombat Desk

Phase A ops console for Tom. Default data is the **fixture book**, not live NAB or CoreLogic portals. When `DESK_API_BASE_URL` is set, Desk reads Andre’s Phase 1.1 HTTP contracts instead.

Working name: **Wombat Desk**. Later host: `desk.wombathomeloans.com.au`. Preview URLs from this repo are enough for now.

This app is for brokers and ops. It is not the kitchen-table marketing site.

Type: **Source Serif 4** for headlines and the product name, **Source Sans 3** for body, UI, and tables. Distinct from the marketing pair (Zilla Slab + IBM Plex Sans).

## How to run locally

From the monorepo root (Node 22, pnpm 10):

```bash
pnpm install
pnpm --filter @wombat/web dev
```

Open [http://localhost:3001](http://localhost:3001). You should land on the **Desk tools** hub. Open **Opportunity Matrix** for **Prai & Amanda × NAB** with **Saving Yes**.

```bash
pnpm --filter @wombat/web typecheck
pnpm --filter @wombat/web build
pnpm test
```

Root `pnpm test` includes:

- `apps/web/lib/data/fixtures.test.ts` — fixture numbers against `@wombat/contracts`
- `apps/web/lib/data/http-source.test.ts` — parses the documented Desk API envelopes (mock `fetch`; no live API in CI)

## Data source

`lib/data/source.ts` is the seam.

| Mode | When | What you see |
| --- | --- | --- |
| **Fixtures (default)** | `DESK_API_BASE_URL` unset | Offline Phase A book: Prai × NAB happy path plus demo cells (CBA Saving No, WBC unknown, Chen household) |
| **HTTP** | `DESK_API_BASE_URL` set | `HttpDeskSource` calls Andre’s read API and maps runs/jobs into the same matrix / runs / jobs view models |

```bash
# Fixture mode (offline default)
pnpm --filter @wombat/web dev

# HTTP mode — Andre’s API on :3000, Desk on :3001
# Next loads env from apps/web, so prefix the command or use apps/web/.env.local
DESK_API_BASE_URL=http://127.0.0.1:3000 pnpm --filter @wombat/web dev

# When the API has DESK_API_KEY set, Desk must send the same key (Phase 1.2).
# Unset = no auth headers (current curls / open local API still work).
DESK_API_BASE_URL=http://127.0.0.1:3000 DESK_API_KEY=dev-desk-key pnpm --filter @wombat/web dev
```

With the Phase 1.1 fixture server you should see run `01JPHASE11PRAI0001` (jobs `job_val_fixture_prai_nab` / `job_price_fixture_prai_nab` / `job_matrix_fixture_prai_nab`) at **$800,000 / $1,025,000 → Saving Yes / 45bp**. Those numbers are still a fixture cell, not a live NAB quote.

`firmId` is `wombat` (`DESK_FIRM_ID` override). No Notion token is required for API fixture mode.

Endpoints (see `docs/desk-api.md`):

- `GET /v1/firms/:firmId/opportunity-runs?client=&status=`
- `GET /v1/firms/:firmId/opportunity-runs/:runId`
- `GET /v1/firms/:firmId/jobs?runId=`
- `GET /v1/firms/:firmId/jobs/:jobId`

Response wrappers `{ firmId, opportunityRuns[] }`, `{ firmId, opportunityRun }`, `{ firmId, jobs[] }`, `{ firmId, job }` are parsed with `@wombat/contracts` `deskOpportunityRunListResponseSchema` et al.

Display labels (client name, address) are not on the run contract. Desk joins `client_prai` / `property_15_ashley` / `loan_nab_800k` to the Phase A strings, and shows the page id when a run is unknown.

`DESK_DATA_SOURCE=api` without `DESK_API_BASE_URL` fails closed. HTTP mode does **not** fall back to fixtures if the API is down.

## What you are looking at

| Screen | Route | Job |
| --- | --- | --- |
| Desk tools | `/` | Hub for live modules and later rooms (Valuation, Pricing, Opportunities stay as coming soon) |
| Opportunity Matrix | `/matrix` | Client × property × loan × lender: val, LVR, current rate, new rate, Saving Yes/No, rank hint |
| Run history | `/runs` | Append-only Opportunity Runs for a loan (dated cells) |
| Job status | `/jobs` | queued, running, awaiting MFA, succeeded, failed |
| Sign in | `/login` | Optional Tom-only password gate |

Saving Yes is a **flag for Tom**, not advice.

### Prai × NAB happy path

- Client: Prai & Amanda
- Property: 15 Ashley Avenue, West Pennant Hills
- Current lender / cell: NAB
- Loan balance: $800,000
- NAB val: $1,025,000 → LVR ~78%
- Current rate: 6.50% (`currentRateSource: notion_loan`)
- New rate: 6.05%
- Saving Yes, `deltaBp`: 45
- `rankHint`: stay_reprice

Other fixture-only rows (CBA Saving No, WBC unknown / awaiting MFA, Chen household) exist so the default grid is a matrix, not a single cell. Andre’s API seed is the single Prai × NAB cell.

## Env

| Variable | Purpose |
| --- | --- |
| `DESK_GATE_PASSWORD` | If set, `/login` is required. If unset, the desk is open and the chrome says “Signed in as Tom”. |
| `DESK_API_BASE_URL` | If set, Desk uses `HttpDeskSource` against that origin. If unset, fixtures. |
| `DESK_API_KEY` | Optional. Same secret as the API (`docs/desk-api.md`). If set, every Desk API request sends `Authorization: Bearer <key>`. If unset, no auth headers — open local/fixture path still works. |
| `DESK_FIRM_ID` | Firm path segment. Default `wombat`. |
| `DESK_DATA_SOURCE` | Optional. `api` without `DESK_API_BASE_URL` is an error. |

Copy from the repo `.env.example`. For the Next app, put overrides in `apps/web/.env.local` or prefix the `dev` command. Do not put portal passwords here.

## Vercel / preview

Desk builds with webpack (`next build --webpack`) so `@wombat/contracts` Node ESM specifiers (`./firm.js` → `firm.ts`) resolve. Turbopack does not honour that alias yet. Contracts themselves are unchanged.

Root `vercel.json` builds `@wombat/web` from the monorepo root so `@wombat/contracts` resolves.

1. Import `wombat-scripts/brokerage-services` in the Wombat Vercel team
2. Framework: Next.js
3. Root directory: repository root (not `apps/web` alone)
4. Build command is already `pnpm --filter @wombat/web build`

Optional: set `DESK_GATE_PASSWORD` on the Vercel project if the preview should not be open. Leave `DESK_API_BASE_URL` unset on preview so it stays on fixtures.

Production DNS for `desk.` is out of scope for Phase A.

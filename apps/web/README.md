# Wombat Desk

Phase A ops console for Tom. It shows the Opportunity Matrix story from **fixture data**, not live NAB or CoreLogic portals.

Working name: **Wombat Desk**. Later host: `desk.wombathomeloans.com.au`. Preview URLs from this repo are enough for now.

This app is for brokers and ops. It is not the kitchen-table marketing site.

## How to run locally

From the monorepo root (Node 22, pnpm 10):

```bash
pnpm install
pnpm --filter @wombat/web dev
```

Open [http://localhost:3001](http://localhost:3001). You should see **Prai & Amanda × NAB** with **Saving Yes**.

```bash
pnpm --filter @wombat/web typecheck
pnpm --filter @wombat/web build
pnpm test
```

Root `pnpm test` includes `apps/web/lib/data/fixtures.test.ts`, which checks fixture numbers against `@wombat/contracts`.

## What you are looking at

| Screen | Route | Job |
| --- | --- | --- |
| Opportunity Matrix | `/` | Client × property × loan × lender: val, LVR, current rate, new rate, Saving Yes/No, rank hint |
| Run history | `/runs` | Append-only Opportunity Runs for a loan (dated cells) |
| Job status | `/jobs` | queued, running, awaiting MFA, succeeded, failed |
| Sign in | `/login` | Optional Tom-only password gate |

Saving Yes is a **flag for Tom**, not advice.

### Prai × NAB happy path (hardcoded)

- Client: Prai & Amanda
- Property: 15 Ashley Avenue, West Pennant Hills
- Current lender / cell: NAB
- Loan balance: $800,000
- NAB val: $1,025,000 → LVR ~78%
- Current rate: 6.50% (`currentRateSource: notion_loan`)
- New rate: 6.05%
- Saving Yes, `deltaBp`: 45
- `rankHint`: stay_reprice

Other rows (CBA Saving No, WBC unknown / awaiting MFA, Chen household fixture) exist so the grid is a matrix, not a single cell. They are labelled as fixture/demo.

## Data is fixtures

`lib/data/source.ts` is the seam.

Today `getDeskSource()` returns `FixtureDeskSource`. Objects are shaped as `@wombat/contracts` `Job` and `OpportunityRun`. Display labels (client name, address) are joined locally because those strings are not on the run contract.

Later, swap in an HTTP source that reads Andre’s API (`GET /jobs`, opportunity-run list reads). Those list endpoints are **not** on `apps/api` yet (`POST /jobs` and `GET /jobs/:jobId` only). Do not pretend they work.

Env:

| Variable | Purpose |
| --- | --- |
| `DESK_GATE_PASSWORD` | If set, `/login` is required. If unset, the desk is open and the chrome says “Signed in as Tom”. |
| `DESK_DATA_SOURCE` | Reserved. Not wired. Always fixtures in Phase A. |

Copy from the repo `.env.example`. Do not put portal passwords here.

## Vercel / preview

Desk builds with webpack (`next build --webpack`) so `@wombat/contracts` Node ESM specifiers (`./firm.js` → `firm.ts`) resolve. Turbopack does not honour that alias yet. Contracts themselves are unchanged.

Root `vercel.json` builds `@wombat/web` from the monorepo root so `@wombat/contracts` resolves.

1. Import `wombat-scripts/brokerage-services` in the Wombat Vercel team
2. Framework: Next.js
3. Root directory: repository root (not `apps/web` alone)
4. Build command is already `pnpm --filter @wombat/web build`

Optional: set `DESK_GATE_PASSWORD` on the Vercel project if the preview should not be open.

Production DNS for `desk.` is out of scope for Phase A.

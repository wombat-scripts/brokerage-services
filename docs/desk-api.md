# Desk read API (Amy)

Phase 1.1 / 1.2 read contracts for Wombat Desk. Shapes come from `@wombat/contracts` (`OpportunityRun`, `Job`). No Notion token is required: when `DATABASE_URL` is unset the API seeds an in-memory Prai × NAB fixture.

Base URL locally: `http://127.0.0.1:3000`

`firmId` is always `wombat`. Other firm ids return **`404`** (not an empty list). List/get are firm-scoped in the store (`firm_id` on every query). CI runs the same list/get against Postgres.

## Seat / service auth (stub)

No multi-tenant product UI. Seats and Desk call the API as a service.

| Mode | When | Header |
| --- | --- | --- |
| Open (default) | `DESK_API_KEY` / `API_AUTH_TOKEN` unset | none — local fixture path, Amy’s current curls keep working |
| Stub key | env set | `Authorization: Bearer <key>` **or** `X-Api-Key: <key>` |

Optional: `X-Requested-By: seat:andre` (create still uses JSON `requestedBy`). `/health` stays open.

When a key is configured and the header is missing or wrong → **`401`**.

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs'
curl -s -H "Authorization: Bearer $DESK_API_KEY" 'http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs'
curl -s -H "X-Api-Key: $DESK_API_KEY" 'http://127.0.0.1:3000/v1/firms/wombat/jobs'
```

## Stable fixture ids

| Resource | Id |
| --- | --- |
| Opportunity run | `01JPHASE11PRAI0001` |
| Valuation job | `job_val_fixture_prai_nab` |
| Pricing job | `job_price_fixture_prai_nab` |
| Matrix job | `job_matrix_fixture_prai_nab` |
| Client page | `client_prai` |
| Property page | `property_15_ashley` |
| Loan page | `loan_nab_800k` |

Happy-path numbers: loan **$800,000**, val **$1,025,000**, LVR **800000 / 1025000 (~0.7805)**, current **6.50%**, new **6.05%**, `savingFlag=yes`, `deltaBp=45`, `deltaAudPa=3600`, `status=succeeded`.

## Endpoints

### `GET /v1/firms/:firmId/opportunity-runs`

List Opportunity Runs for the firm.

Query:

| Param | Required | Notes |
| --- | --- | --- |
| `client` | no | Case-insensitive substring match on `clientPageId` |
| `status` | no | `succeeded` \| `failed` \| `unknown` \| `voided` |

```json
{
  "firmId": "wombat",
  "opportunityRuns": [
    {
      "runId": "01JPHASE11PRAI0001",
      "firmId": "wombat",
      "ranAt": "2026-09-11T06:00:00.000Z",
      "requestedBy": "platform-andre",
      "clientPageId": "client_prai",
      "propertyPageId": "property_15_ashley",
      "loanPageId": "loan_nab_800k",
      "currentLenderCode": "NAB",
      "targetLenderCode": "NAB",
      "loanBalanceAud": 800000,
      "valAud": 1025000,
      "valDate": "2026-09-11",
      "valSource": "other",
      "lvr": 0.7804878048780488,
      "currentRate": 0.065,
      "currentRateSource": "notion_loan",
      "newRate": 0.0605,
      "savingFlag": "yes",
      "deltaBp": 45,
      "deltaAudPa": 3600,
      "status": "succeeded",
      "valuationJobId": "job_val_fixture_prai_nab",
      "pricingJobId": "job_price_fixture_prai_nab",
      "matrixJobId": "job_matrix_fixture_prai_nab",
      "artefactUris": ["fixture:prai-nab-val", "fixture:prai-nab-price"],
      "notes": "Phase 1.1 seed. Matches Phase 1 matrix_cell test: 800k / 1.025m → Saving Yes / 45bp. Flag for Tom, not advice."
    }
  ]
}
```

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs'
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs?client=client_prai&status=succeeded'
```

### `GET /v1/firms/:firmId/opportunity-runs/:runId`

```json
{
  "firmId": "wombat",
  "opportunityRun": { "runId": "01JPHASE11PRAI0001" }
}
```

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs/01JPHASE11PRAI0001'
```

### `GET /v1/firms/:firmId/jobs`

List jobs. Optional `runId` returns the valuation, pricing, and matrix jobs linked to that run.

```json
{
  "firmId": "wombat",
  "jobs": [
    {
      "jobId": "job_val_fixture_prai_nab",
      "firmId": "wombat",
      "kind": "valuation.lender",
      "version": "0.1.0",
      "status": "succeeded",
      "requestedBy": "platform-andre",
      "createdAt": "2026-09-11T05:50:00.000Z",
      "updatedAt": "2026-09-11T05:51:00.000Z",
      "startedAt": "2026-09-11T05:50:10.000Z",
      "finishedAt": "2026-09-11T05:51:00.000Z",
      "input": {},
      "output": { "lenderCode": "NAB", "valueAud": 1025000 },
      "artefacts": [],
      "audit": [
        {
          "at": "2026-09-11T05:50:00.000Z",
          "actor": "platform-andre",
          "action": "job.created",
          "firmId": "wombat",
          "requester": "platform-andre",
          "detail": { "firm_id": "wombat", "requester": "platform-andre", "kind": "valuation.lender" }
        }
      ],
      "subjectRefs": { "propertyPageId": "property_15_ashley" }
    }
  ]
}
```

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/jobs'
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/jobs?runId=01JPHASE11PRAI0001'
```

Unknown `runId` (missing or another firm) → **`404`**, not `{ "jobs": [] }`.

### `GET /v1/firms/:firmId/jobs/:jobId`

```json
{
  "firmId": "wombat",
  "job": { "jobId": "job_val_fixture_prai_nab", "kind": "valuation.lender", "status": "succeeded" }
}
```

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/jobs/job_val_fixture_prai_nab'
```

## Errors

| Status | When |
| --- | --- |
| `400` | Invalid query (`status` not in the enum) |
| `401` | API key configured and Bearer / `X-Api-Key` missing or wrong |
| `404` | Unknown `firmId`, run, job, or `jobs?runId=` that is missing / other-firm |

## Seat write path

Canonical create is firm-scoped. `POST /jobs` remains a **wombat-default alias** (same body, still stamps `firmId=wombat`).

### `POST /v1/firms/:firmId/jobs`

Wrong `firmId` → `404`. Body is unchanged: `kind`, `requestedBy`, `input`, optional `subjectRefs`. Create audit always includes `firmId` / `detail.firm_id` and `requester`.

```bash
curl -s -X POST 'http://127.0.0.1:3000/v1/firms/wombat/jobs' \
  -H 'content-type: application/json' \
  -d '{"kind":"valuation.lender","requestedBy":"seat:andre","input":{"fixture":true,"lenderCode":"NAB"}}'
```

`GET /jobs/:jobId` remains a wombat-default alias. Prefer `GET /v1/firms/wombat/jobs/:jobId`.

## Contracts

Import from `@wombat/contracts`:

- `opportunityRunSchema` / `OpportunityRun`
- `jobSchema` / `Job`
- `deskOpportunityRunListResponseSchema`
- `deskOpportunityRunResponseSchema`
- `deskJobListResponseSchema`
- `deskJobResponseSchema`

Seat write path: `POST /v1/firms/:firmId/jobs` (canonical) or `POST /jobs` (wombat alias). Poll `GET /v1/firms/:firmId/jobs/:jobId` or `GET /jobs/:jobId`.

## Notion write-back (not required to read)

Live Opportunity Runs DB id: `54120476-0e40-4887-b457-0ff486ecb205`. Set `NOTION_OPPORTUNITY_RUNS_DATABASE_ID` and `NOTION_TOKEN` only when the worker should append runs. Missing token or DB id **fail-closes**. Desk reads do not call Notion.

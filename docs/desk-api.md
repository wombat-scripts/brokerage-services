# Desk read API (Amy)

Phase 1.1 read contracts for Wombat Desk. Shapes come from `@wombat/contracts` (`OpportunityRun`, `Job`). No Notion token is required: when `DATABASE_URL` is unset the API seeds an in-memory Prai × NAB fixture.

Base URL locally: `http://127.0.0.1:3000`

`firmId` is always `wombat`. Other firm ids return `404`.

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
      "audit": [],
      "subjectRefs": { "propertyPageId": "property_15_ashley" }
    }
  ]
}
```

```bash
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/jobs'
curl -s 'http://127.0.0.1:3000/v1/firms/wombat/jobs?runId=01JPHASE11PRAI0001'
```

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
| `404` | Unknown `firmId`, run, or job |

## Contracts

Import from `@wombat/contracts`:

- `opportunityRunSchema` / `OpportunityRun`
- `jobSchema` / `Job`
- `deskOpportunityRunListResponseSchema`
- `deskOpportunityRunResponseSchema`
- `deskJobListResponseSchema`
- `deskJobResponseSchema`

Seat write path is unchanged: `POST /jobs` + `GET /jobs/:jobId` (no `/v1/firms` prefix).

## Notion write-back (not required to read)

Live Opportunity Runs DB id: `54120476-0e40-4887-b457-0ff486ecb205`. Set `NOTION_OPPORTUNITY_RUNS_DATABASE_ID` and `NOTION_TOKEN` only when the worker should append runs. Missing token or DB id **fail-closes**. Desk reads do not call Notion.

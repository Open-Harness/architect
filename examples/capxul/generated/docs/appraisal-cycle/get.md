<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.get

Read one appraisal-cycle by its id: company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | appraisal-cycle.id |

## Answer

| field | value |
|---|---|
| company | appraisal-cycle.company |
| cycleName | appraisal-cycle.cycleName |
| startDate | appraisal-cycle.startDate |
| endDate | appraisal-cycle.endDate |
| kraEvaluationMethod | appraisal-cycle.kraEvaluationMethod |
| appraisees | appraisal-cycle.appraisees |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## How to call

```sh
capxul appraisal-cycle get --id <id>
```

HTTP: `POST /appraisal-cycle/get` with the payload as JSON. SDK: `Sdk.appraisal-cycle.get(payload)`.

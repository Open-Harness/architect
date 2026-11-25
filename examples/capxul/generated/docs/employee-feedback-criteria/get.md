<!-- Generated from the blueprint. Do not edit. -->
# employee-feedback-criteria.get

Read one employee-feedback-criteria by its id: company, criteria, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-feedback-criteria.id |

## Answer

| field | value |
|---|---|
| company | employee-feedback-criteria.company |
| criteria | employee-feedback-criteria.criteria |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## How to call

```sh
capxul employee-feedback-criteria get --id <id>
```

HTTP: `POST /employee-feedback-criteria/get` with the payload as JSON. SDK: `Sdk.employee-feedback-criteria.get(payload)`.

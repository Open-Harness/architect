<!-- Generated from the blueprint. Do not edit. -->
# appraisal-template.get

Read one appraisal-template by its id: company, title, kras, criteria, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | appraisal-template.id |

## Answer

| field | value |
|---|---|
| company | appraisal-template.company |
| title | appraisal-template.title |
| kras | appraisal-template.kras |
| criteria | appraisal-template.criteria |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## How to call

```sh
capxul appraisal-template get --id <id>
```

HTTP: `POST /appraisal-template/get` with the payload as JSON. SDK: `Sdk.appraisal-template.get(payload)`.

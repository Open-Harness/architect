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

## Worked examples

### set up kras and criteria

Starts from the world `three companies`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's employeeFeedbackCriteria, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's employeeFeedbackCriteria, and gets back [the world's company, `Problem Solving`, `active`].
- **it reads back in lower case.** `ada` (role company.owner) calls and sends id the last call's employeeFeedbackCriteria, and gets back [the world's company, `teamwork`].

## How to call

```sh
capxul employee-feedback-criteria get --id <id>
```

HTTP: `POST /employee-feedback-criteria/get` with the payload as JSON. SDK: `Sdk.employee-feedback-criteria.get(payload)`.

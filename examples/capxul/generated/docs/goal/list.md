<!-- Generated from the blueprint. Do not edit. -->
# goal.list

List goals, oldest first, 50 to a page, filtered by appraisalCycle, employee.

**Who may call:** the self of its employee, or the owner of its appraisalCycle.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by appraisalCycle, employee; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| appraisalCycle (optional) | goal.appraisalCycle |
| employee (optional) | goal.employee |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its appraisalCycle.company; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't list Olga's goals.** `cy` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **nor can Bo list the cycle's.** `bo` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **Olga lists her goals to reach Platform.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 3.
- **Olga lists them again.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 4.
- **Guides follows to 60, and Platform, two levels up, to 61.67, the average of 100, 25 and 60.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [[`Ship the ledger`, `50`, false, null, `inProgress`], [`Platform`, `61.67`, true, null, `inProgress`], [`Design API`, `100`, false, 1, `completed`], [`Write docs`, `25`, false, 1, `inProgress`], [`Guides`, `60`, true, 1, `inProgress`], [`Guide one`, `60`, false, 4, `inProgress`]].
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Platform leaves it out: the average of 100 and 60 is 80.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [[`Ship the ledger`, `50`, `inProgress`], [`Platform`, `80`, `inProgress`], [`Design API`, `100`, `completed`], [`Write docs`, `90`, `archived`], [`Guides`, `60`, `inProgress`], [`Guide one`, `60`, `inProgress`]].
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Olga lists H1 2027's goals.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back 2.
- **Olga lists her H2 2026 goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.

## How to call

```sh
capxul goal list [--appraisalCycle <appraisalCycle>] [--employee <employee>] [--cursor <cursor>]
```

HTTP: `POST /goal/list` with the payload as JSON. SDK: `Sdk.goal.list(payload)`.

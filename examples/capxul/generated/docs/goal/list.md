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

## How to call

```sh
capxul goal list [--appraisalCycle <appraisalCycle>] [--employee <employee>] [--cursor <cursor>]
```

HTTP: `POST /goal/list` with the payload as JSON. SDK: `Sdk.goal.list(payload)`.

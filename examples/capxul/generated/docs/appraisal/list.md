<!-- Generated from the blueprint. Do not edit. -->
# appraisal.list

List appraisals, oldest first, 50 to a page, filtered by appraisalCycle, employee.

**Who may call:** the self of its employee, or the owner of its appraisalCycle.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by appraisalCycle, employee; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| appraisalCycle (optional) | appraisal.appraisalCycle |
| employee (optional) | appraisal.employee |
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

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **no appraisal is made before it starts.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back 0.
- **the cycle's appraisals are Olga's, now submitted, then Cy's, each copying the template with every score 0.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back [[the world's company, the world's employee, the world's appraisalCycle, the world's appraisalTemplate, `Automated Based on Goal Progress`, `submitted`, [[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], [`0`, `0`, `0`, `0`]], [the world's company, the world's secondEmployee, the world's appraisalCycle, the world's appraisalTemplate, `Automated Based on Goal Progress`, `draft`, [[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], [`0`, `0`, `0`, `0`]]].
- **Olga sees hers alone.** `olga` (signed in) calls and sends employee the world's employee, and gets back [[the world's company, the world's employee, the world's appraisalCycle, the world's appraisalTemplate, `Automated Based on Goal Progress`, `submitted`, [[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], [`0`, `0`, `0`, `0`]]].
- **Bo can't list the cycle's.** `bo` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **nor Olga's.** `bo` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **Ada lists them again.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back [`submitted`, `draft`].
- **Q1 2027 holds Olga's and Cy's, rated by hand, and none of Dee's.** `ada` (role company.owner) calls and sends appraisalCycle the world's threePersonCycle, and gets back [[the world's employee, `Manual Rating`, `draft`], [the world's secondEmployee, `Manual Rating`, `draft`]].

## How to call

```sh
capxul appraisal list [--appraisalCycle <appraisalCycle>] [--employee <employee>] [--cursor <cursor>]
```

HTTP: `POST /appraisal/list` with the payload as JSON. SDK: `Sdk.appraisal.list(payload)`.

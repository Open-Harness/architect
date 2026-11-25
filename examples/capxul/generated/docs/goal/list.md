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

### appraise a year

Starts from the world `a second feedback criteria`.

- **Olga's goals: Ship v2 has followed the API to 100.** `olga` (signed in) calls and sends appraisalCycle the last call's appraisalCycle, employee the world's employee, and gets back [[`Ship v2`, `100`, `completed`], [`API`, `100`, `completed`]].
- **her goals.** `olga` (signed in) calls and sends appraisalCycle the last call's appraisalCycle, employee the world's employee, and gets back `Refactoring`.
- **her goals read back in the order she set them, the API and the UI under Ship v2.** `olga` (signed in) calls and sends appraisalCycle the last call's items 0 appraisalCycle, employee the world's employee, and gets back [[`Ship v2`, the world's kra, `85`, true, null, `inProgress`], [`API`, the world's kra, `100`, false, 0, `completed`], [`UI`, the world's kra, `70`, false, 0, `inProgress`], [`Refactoring`, the world's otherKra, `40`, false, null, `inProgress`]].

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't list Olga's goals.** `cy` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **nor can Bo list the cycle's.** `bo` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **Platform follows its one child to 100, completed.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [3, `Platform work`, `100`, `completed`].
- **Platform is now 62.5, in progress.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [4, `62.5`, `inProgress`].
- **Guides follows to 60, and Platform, two levels up, to 61.67, the average of 100, 25 and 60.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [[`Ship the ledger`, `50`, false, null, `inProgress`], [`Platform work`, `61.67`, true, null, `inProgress`], [`API design`, `100`, false, 1, `completed`], [`Docs writing`, `25`, false, 1, `inProgress`], [`Guides`, `60`, true, 1, `inProgress`], [`First guide`, `60`, false, 4, `inProgress`]].
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Platform leaves it out: the average of 100 and 60 is 80.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back [[`Ship the ledger`, `50`, `inProgress`], [`Platform work`, `80`, `inProgress`], [`API design`, `100`, `completed`], [`Docs writing`, `90`, `archived`], [`Guides`, `60`, `inProgress`], [`First guide`, `60`, `inProgress`]].
- **Olga lists her goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.
- **Olga lists H1 2027's goals.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back 2.
- **Olga lists H1 2027's goals to reach Pair.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back [8, `Pair`].
- **a closed child still counts: Pair is 60, the average of 40 and 80.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back [`Pair`, `60`, `inProgress`].
- **Olga lists them to reach Outer and Inner.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back [`Outer`, `Inner`].
- **Olga lists them again.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back 13.
- **Outer averages its children, Inner's 30 and Gamma's 100, not its leaves: 65.** `olga` (signed in) calls and sends appraisalCycle the world's manualCycle, employee the world's employee, and gets back [[`Outer`, `65`, `inProgress`], [`Inner`, `30`, `inProgress`]].
- **Olga lists her H2 2026 goals.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, employee the world's employee, and gets back 6.

## How to call

```sh
capxul goal list [--appraisalCycle <appraisalCycle>] [--employee <employee>] [--cursor <cursor>]
```

HTTP: `POST /goal/list` with the payload as JSON. SDK: `Sdk.goal.list(payload)`.

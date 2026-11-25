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

## Worked examples

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **H2 2026 reads back not started, appraising Olga then Cy.** `ada` (role company.owner) calls and sends id the world's appraisalCycle, and gets back [the world's company, `H2 2026`, `2026-07-01`, `2026-12-31`, `Automated Based on Goal Progress`, [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's secondEmployee, appraisalTemplate: the world's appraisalTemplate }], `notStarted`].
- **Olga can't read the cycle.** `olga` (signed in) calls and sends id the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **the cycle's settings read back unchanged.** `ada` (role company.owner) calls and sends id the world's appraisalCycle, and gets back [`H2 2026`, `2026-07-01`, `2026-12-31`, `Automated Based on Goal Progress`, [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's secondEmployee, appraisalTemplate: the world's appraisalTemplate }], `inProgress`].

## How to call

```sh
capxul appraisal-cycle get --id <id>
```

HTTP: `POST /appraisal-cycle/get` with the payload as JSON. SDK: `Sdk.appraisal-cycle.get(payload)`.

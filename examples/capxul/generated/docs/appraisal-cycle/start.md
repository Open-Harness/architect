<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.start

Start a cycle, making an appraisal for each appraisee who has none yet.

**Who may call:** the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 500ms.

## Payload

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Answer

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |
| appraisals | AppraisalIds |

## Move

`start`: from notStarted to inProgress, emitting AppraisalCycleStarted.

## Steps

- `appraisal-cycle.start.load` (database)
- `appraisal-cycle.start.create` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CycleWithoutAppraisees | 46 | CY-006 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| CycleNameTaken | 48 | CY-008 | another appraisal cycle holds this company and cycle name; by the rule appraisal-cycle.oneNamePerCompany, carrying cycleName |
| AppraisalCycleNotNotStarted | 40 | CY-900 | the appraisal-cycle is in a state start can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Bo can't start it.** `bo` (signed in) calls and sends appraisalCycle the last call's appraisalCycle, and is refused with NotAllowed, AR-001.
- **Ada starts it: an appraisal each for Olga and Cy.** `ada` (role company.owner) calls and sends appraisalCycle the last call's appraisalCycle, and gets back 2.

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **but it can't start.** `ada` (role company.owner) calls and sends appraisalCycle the last call's appraisalCycle, and is refused with CycleWithoutAppraisees, CY-006.
- **Bo can't start H2 2026.** `bo` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **Ada starts it, making two appraisals.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back [the world's appraisalCycle, 2, true].
- **it can't start twice.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalCycleNotNotStarted, CY-900, carrying state `inProgress`.
- **nor start again.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalCycleNotNotStarted, CY-900, carrying state `completed`.
- **Ada starts Q1 2027: Olga has one already and Dee has left, so it makes Cy's alone.** `ada` (role company.owner) calls and sends appraisalCycle the world's threePersonCycle, and gets back 1.
- **she starts it: two appraisals.** `ada` (role company.owner) calls and sends appraisalCycle the last call's appraisalCycle, and gets back 2.
- **starting the summer cycle makes nothing, since Olga has hers, and it is in progress.** `ada` (role company.owner) calls and sends appraisalCycle the last call's appraisalCycle, and gets back 0.

## How to call

```sh
capxul appraisal-cycle start --appraisalCycle <appraisalCycle>
```

HTTP: `POST /appraisal-cycle/start` with the payload as JSON. SDK: `Sdk.appraisal-cycle.start(payload)`.

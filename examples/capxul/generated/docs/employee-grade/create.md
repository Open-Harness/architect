<!-- Generated from the blueprint. Do not edit. -->
# employee-grade.create

Add a grade to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | employee-grade.company |
| gradeName | employee-grade.gradeName |

## Answer

| field | value |
|---|---|
| grade | employee-grade.id |

## Move

`create`: from nothing (it creates) to active, emitting EmployeeGradeCreated.

## Steps

- `employee-grade.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EmployeeGradeNameTaken | 41 | EG-001 | another employee grade holds this company and grade name; by the rule employee-grade.oneNamePerCompany, carrying gradeName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### grade names are the company's

Starts from the world `four grades`.

- **Ada can't add a second grade of the same name.** `ada` (role company.owner) calls and sends company the world's company, gradeName `Senior`, and is refused with EmployeeGradeNameTaken, EG-001, carrying gradeName `Senior`.
- **nor reuse a name her second company holds there.** `ada` (role company.owner) calls and sends company the world's otherCompany, gradeName `cadre supérieur  B/3 (d'Abidjan’s HQ) ደረጃ`, and is refused with EmployeeGradeNameTaken, EG-001, carrying gradeName `cadre supérieur  B/3 (d'Abidjan’s HQ) ደረጃ`.
- **Bo can't add a grade to Ada's company.** `bo` (signed in) calls and sends company the world's company, gradeName `007`, and is refused with NotAllowed, AR-001.
- **Bo adds his company's first grade, named with digits alone.** `bo` (signed in) calls and sends company the world's boCompany, gradeName `007`, and gets back an answer matching `^egr_[0-9a-z]+$`.

### set up grades

Starts from the world `a company`.

- **Ada adds a grade.** `ada` (role company.owner) calls and sends company the world's company, gradeName `Junior`, and gets back an answer matching `^egr_[0-9a-z]+$`.
- **Bo can't add a grade to Ada's company.** `bo` (signed in) calls and sends company the world's company, gradeName `Lead`, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul employee-grade create --company <company> --gradeName <gradeName>
```

HTTP: `POST /employee-grade/create` with the payload as JSON. SDK: `Sdk.employee-grade.create(payload)`.

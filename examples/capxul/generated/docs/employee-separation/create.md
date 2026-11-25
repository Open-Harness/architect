<!-- Generated from the blueprint. Do not edit. -->
# employee-separation.create

Start an employee's separation, from their resignation letter.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | employee-separation.company |
| employee | employee-separation.employee |
| resignationLetterDate | employee-separation.resignationLetterDate |
| boardingBeginsOn | employee-separation.boardingBeginsOn |

## Answer

| field | value |
|---|---|
| employeeSeparation | employee-separation.id |

## Move

`create`: from nothing (it creates) to pending, emitting EmployeeSeparationStarted.

## Steps

- `employee-separation.create.load` (database)
- `employee-separation.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SeparatedEmployeeNotInCompany | 41 | SP-001 | declared in errors.ts |
| SeparationAlreadyOpen | 42 | SP-002 | another pending or inProcess employee separation holds this employee; by the rule employee-separation.oneOpenSeparationPerEmployee |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **Dee resigns: Ada starts her separation, from her letter of 30 November, beginning 14 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's newHire, resignationLetterDate `2026-11-30`, boardingBeginsOn `2026-12-14`, and gets back an answer matching `^esp_[0-9a-z]+$`.

### run a separation

Starts from the world `a separation`.

- **Bo can't start a separation in Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's secondEmployee, resignationLetterDate `2026-11-23`, boardingBeginsOn `2026-12-02`, and is refused with NotAllowed, AR-001.
- **Ada can't start a second for Olga while hers is pending.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, resignationLetterDate `2026-11-25`, boardingBeginsOn `2026-12-03`, and is refused with SeparationAlreadyOpen, SP-002.
- **Ada can't start one for Bo in Acme Trading, where he doesn't work.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, resignationLetterDate `2026-11-23`, boardingBeginsOn `2026-12-02`, and is refused with SeparatedEmployeeNotInCompany, SP-001.
- **Olga in Acme Logistics is refused for her company, before her open separation is.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's employee, resignationLetterDate `2026-11-25`, boardingBeginsOn `2026-12-03`, and is refused with SeparatedEmployeeNotInCompany, SP-001.
- **nor start a second for Olga while hers is in process.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, resignationLetterDate `2026-11-25`, boardingBeginsOn `2026-12-03`, and is refused with SeparationAlreadyOpen, SP-002.
- **with that one completed, Ada may start a new one for Olga.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, resignationLetterDate `2026-11-25`, boardingBeginsOn `2026-12-03`, and gets back an answer matching `^esp_[0-9a-z]+$`.
- **Cy has left, and Ada may still start her separation, as HRMS doesn't judge the employee's status.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, resignationLetterDate `2026-11-23`, boardingBeginsOn `2026-12-02`, and gets back an answer matching `^esp_[0-9a-z]+$`.
- **and a third for Olga is allowed beside Cy's open one.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, resignationLetterDate `2026-11-27`, boardingBeginsOn `2026-12-04`, and gets back an answer matching `^esp_[0-9a-z]+$`.

## How to call

```sh
capxul employee-separation create --company <company> --employee <employee> --resignationLetterDate <resignationLetterDate> --boardingBeginsOn <boardingBeginsOn>
```

HTTP: `POST /employee-separation/create` with the payload as JSON. SDK: `Sdk.employee-separation.create(payload)`.

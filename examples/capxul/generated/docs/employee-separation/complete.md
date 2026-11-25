<!-- Generated from the blueprint. Do not edit. -->
# employee-separation.complete

Mark a separation completed. The employee is relieved by its own call.

**Who may call:** the owner of its employeeSeparation.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| employeeSeparation | employee-separation.id |

## Answer

| field | value |
|---|---|
| employeeSeparation | employee-separation.id |

## Move

`complete`: from pending or inProcess to completed, emitting EmployeeSeparationCompleted.

## Steps

- `employee-separation.complete.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EmployeeSeparationNotPending | 40 | SP-900 | the employee-separation is in a state complete can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeeSeparation.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **and completes it.** `ada` (role company.owner) calls and sends employeeSeparation the last call's employeeSeparation, and gets back an answer matching `^esp_[0-9a-z]+$`.

### run a separation

Starts from the world `a separation`.

- **Bo can't complete it.** `bo` (signed in) calls and sends employeeSeparation the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **nor can Cy.** `cy` (signed in) calls and sends employeeSeparation the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **nor Olga.** `olga` (signed in) calls and sends employeeSeparation the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **Ada completes it.** `ada` (role company.owner) calls and sends employeeSeparation the world's employeeSeparation, and gets back the world's employeeSeparation.
- **Ada can't complete it twice.** `ada` (role company.owner) calls and sends employeeSeparation the world's employeeSeparation, and is refused with EmployeeSeparationNotPending, SP-900, carrying state `completed`.
- **and complete it straight from pending.** `ada` (role company.owner) calls and sends employeeSeparation the last call's employeeSeparation, and gets back an answer matching `^esp_[0-9a-z]+$`.

## How to call

```sh
capxul employee-separation complete --employeeSeparation <employeeSeparation>
```

HTTP: `POST /employee-separation/complete` with the payload as JSON. SDK: `Sdk.employee-separation.complete(payload)`.

<!-- Generated from the blueprint. Do not edit. -->
# employee-separation.begin

Mark a separation in process.

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

`begin`: from pending to inProcess, emitting EmployeeSeparationBegun.

## Steps

- `employee-separation.begin.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SeparationAlreadyOpen | 42 | SP-002 | another pending or inProcess employee separation holds this employee; by the rule employee-separation.oneOpenSeparationPerEmployee |
| EmployeeSeparationNotPending | 40 | SP-900 | the employee-separation is in a state begin can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeeSeparation.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **Ada marks it in process.** `ada` (role company.owner) calls and sends employeeSeparation the last call's employeeSeparation, and gets back an answer matching `^esp_[0-9a-z]+$`.

### run a separation

Starts from the world `a separation`.

- **Bo can't mark Olga's in process.** `bo` (signed in) calls and sends employeeSeparation the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends employeeSeparation the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **Ada marks it in process.** `ada` (role company.owner) calls and sends employeeSeparation the world's employeeSeparation, and gets back the world's employeeSeparation.
- **Ada can't mark it in process twice.** `ada` (role company.owner) calls and sends employeeSeparation the world's employeeSeparation, and is refused with EmployeeSeparationNotPending, SP-900, carrying state `inProcess`.
- **nor mark it in process again.** `ada` (role company.owner) calls and sends employeeSeparation the world's employeeSeparation, and is refused with EmployeeSeparationNotPending, SP-900, carrying state `completed`.

## How to call

```sh
capxul employee-separation begin --employeeSeparation <employeeSeparation>
```

HTTP: `POST /employee-separation/begin` with the payload as JSON. SDK: `Sdk.employee-separation.begin(payload)`.

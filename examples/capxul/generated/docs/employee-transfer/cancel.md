<!-- Generated from the blueprint. Do not edit. -->
# employee-transfer.cancel

Cancel a submitted transfer, putting back the department it replaced.

**Who may call:** the owner of its employeeTransfer.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| employeeTransfer | employee-transfer.id |

## Answer

| field | value | description |
|---|---|---|
| employeeTransfer | employee-transfer.id |  |
| employee | employee-transfer.employee |  |
| department | employee-transfer.currentDepartment | The department the employee held when the transfer was drafted. |

## Move

`cancel`: from submitted to cancelled, emitting EmployeeTransferCancelled.

## Steps

- `employee-transfer.cancel.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EmployeeAlreadyHired | 41 | EM-001 | another active employee holds this company and person; by the rule employee.onePlacePerPerson, carrying person |
| EmployeeTransferNotDraft | 40 | TR-900 | the employee-transfer is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeeTransfer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### transfer an employee

Starts from the world `a second transfer`.

- **Ada can't cancel it while it is a draft.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with EmployeeTransferNotDraft, TR-900, carrying state `draft`.
- **Bo can't cancel Olga's first.** `bo` (signed in) calls and sends employeeTransfer the world's employeeTransfer, and is refused with NotAllowed, AR-001.
- **Ada cancels it, putting back Engineering.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and gets back [the world's employeeTransfer, the world's employee, the world's department].
- **Ada can't cancel it twice.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with EmployeeTransferNotDraft, TR-900, carrying state `cancelled`.

## How to call

```sh
capxul employee-transfer cancel --employeeTransfer <employeeTransfer>
```

HTTP: `POST /employee-transfer/cancel` with the payload as JSON. SDK: `Sdk.employee-transfer.cancel(payload)`.

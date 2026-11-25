<!-- Generated from the blueprint. Do not edit. -->
# employee-transfer.submit

Submit a transfer on or after its day, giving the employee the new department.

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
| department | employee-transfer.newDepartment | The department the employee holds once it is submitted. |

## Move

`submit`: from draft to submitted, emitting EmployeeTransferred.

## Steps

- `employee-transfer.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TransferNotYetDue | 45 | TR-005 | declared in errors.ts, carrying transferDate |
| EmployeeAlreadyHired | 41 | EM-001 | another active employee holds this company and person; by the rule employee.onePlacePerPerson, carrying person |
| EmployeeTransferNotDraft | 40 | TR-900 | the employee-transfer is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeeTransfer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **Ada submits Dee's transfer.** `ada` (role company.owner) calls and sends employeeTransfer the last call's employeeTransfer, and gets back [the world's newHire, the world's secondDepartment].

### transfer an employee

Starts from the world `a second transfer`.

- **Ada can't submit Olga's before its day.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with TransferNotYetDue, TR-005, carrying transferDate `2026-12-08`.
- **Bo can't submit it.** `bo` (signed in) calls and sends employeeTransfer the world's employeeTransfer, and is refused with NotAllowed, AR-001.
- **nor can Olga submit her own.** `olga` (signed in) calls and sends employeeTransfer the world's employeeTransfer, and is refused with NotAllowed, AR-001.
- **Ada still can't submit it.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with TransferNotYetDue, TR-005, carrying transferDate `2026-12-08`.
- **Ada submits it on the day itself.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and gets back [the world's employeeTransfer, the world's employee, the world's secondDepartment].
- **Ada can't submit it twice.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with EmployeeTransferNotDraft, TR-900, carrying state `submitted`.
- **nor submit it again.** `ada` (role company.owner) calls and sends employeeTransfer the world's employeeTransfer, and is refused with EmployeeTransferNotDraft, TR-900, carrying state `cancelled`.
- **Ada still submits Cy's transfer, drafted before she left.** `ada` (role company.owner) calls and sends employeeTransfer the world's secondTransfer, and gets back [the world's secondTransfer, the world's secondEmployee, the world's secondDepartment].

## How to call

```sh
capxul employee-transfer submit --employeeTransfer <employeeTransfer>
```

HTTP: `POST /employee-transfer/submit` with the payload as JSON. SDK: `Sdk.employee-transfer.submit(payload)`.

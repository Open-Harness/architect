<!-- Generated from the blueprint. Do not edit. -->
# employee.relieve

Record that an employee has left the company, on the day they were relieved.

**Who may call:** the owner of its employee.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| employee | employee.id |
| relievingDate | Day |

## Answer

| field | value |
|---|---|
| employee | employee.id |
| relievingDate | Day |

## Move

`relieve`: from active to left, emitting EmployeeRelieved.

## Steps

- `employee.relieve.load` (database)
- `employee.relieve.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RelievedBeforeJoined | 45 | EM-005 | declared in errors.ts, carrying dateOfJoining |
| EmployeeNotActive | 40 | EM-900 | the employee is in a state relieve can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employee.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### an employee leaves

Starts from the world `an employee`.

- **Olga can't relieve herself.** `olga` (signed in) calls and sends employee the world's employee, relievingDate `2026-11-30`, and is refused with NotAllowed, AR-001.
- **Ada can't relieve her the day before she joined.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-01-04`, and is refused with RelievedBeforeJoined, EM-005, carrying dateOfJoining `2026-01-05`.
- **Ada relieves her on 30 November.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-11-30`, and gets back [the world's employee, `2026-11-30`].
- **she can't be relieved twice.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-12-01`, and is refused with EmployeeNotActive, EM-900, carrying state `left`.
- **the new employee can't be relieved the day before rejoining.** `ada` (role company.owner) calls and sends employee the last call's employee, relievingDate `2027-01-31`, and is refused with RelievedBeforeJoined, EM-005, carrying dateOfJoining `2027-02-01`.
- **but may be relieved on the day of rejoining itself.** `ada` (role company.owner) calls and sends employee the last call's employee, relievingDate `2027-02-01`, and gets back `2027-02-01`.

### attendance stays in its company

Starts from the world `an attendance request`.

- **Ada relieves Olga on 30 November.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-11-30`, and gets back `2026-11-30`.

### expense claims stay in their company

Starts from the world `an expense claim`.

- **Ada relieves Olga on 30 November.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-11-30`, and gets back `2026-11-30`.

### give interview feedback

Starts from the world `an interview`.

- **Ada relieves Cy on 3 December.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, relievingDate `2026-12-03`, and gets back `2026-12-03`.

### move an employee through the company

Starts from the world `a new hire`.

- **Ada relieves Dee on 31 December.** `ada` (role company.owner) calls and sends employee the world's newHire, relievingDate `2026-12-31`, and gets back [the world's newHire, `2026-12-31`].

### promote an employee

Starts from the world `a second transfer`.

- **Ada relieves Bo on 30 November.** `ada` (role company.owner) calls and sends employee the world's outsider, relievingDate `2026-11-30`, and gets back the world's outsider.
- **Ada relieves Cy on 30 November.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, relievingDate `2026-11-30`, and gets back the world's secondEmployee.

### schedule an interview

Starts from the world `an outside employee`.

- **Ada relieves Olga on 30 November.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-11-30`, and gets back `2026-11-30`.

### set up interview rounds

Starts from the world `an outside employee`.

- **Ada relieves Olga on 30 November.** `ada` (role company.owner) calls and sends employee the world's employee, relievingDate `2026-11-30`, and gets back `2026-11-30`.

### transfer an employee

Starts from the world `a second transfer`.

- **Ada relieves Bo on 30 November.** `ada` (role company.owner) calls and sends employee the world's outsider, relievingDate `2026-11-30`, and gets back the world's outsider.
- **Ada relieves Cy on 30 November.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, relievingDate `2026-11-30`, and gets back the world's secondEmployee.

## How to call

```sh
capxul employee relieve --employee <employee> --relievingDate <relievingDate>
```

HTTP: `POST /employee/relieve` with the payload as JSON. SDK: `Sdk.employee.relieve(payload)`.

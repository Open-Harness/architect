<!-- Generated from the blueprint. Do not edit. -->
# employee.get

Read one employee by its id: company, person, firstName, gender, dateOfBirth, dateOfJoining, department, designation, state.

**Who may call:** the self of the employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee.id |

## Answer

| field | value | description |
|---|---|---|
| company | employee.company |  |
| person | employee.person | The person employed, who signs in as themselves. |
| firstName | employee.firstName |  |
| gender | employee.gender |  |
| dateOfBirth | employee.dateOfBirth |  |
| dateOfJoining | employee.dateOfJoining |  |
| department | employee.department |  |
| designation | employee.designation |  |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of the employee, or the owner of its company; the handler never runs |

## Worked examples

### an employee leaves

Starts from the world `an employee`.

- **Ada reads Olga's record, as the company's owner.** `ada` (role company.owner) calls and sends id the world's employee, and gets back [the world's company, the cast's olga person, `2026-01-05`, `active`].
- **Olga still reads her old record, which shows she has left.** `olga` (signed in) calls and sends id the world's employee, and gets back [`2026-01-05`, `left`].

### hire an employee

Starts from the world `a team`.

- **Bo can't read Olga's record.** `bo` (signed in) calls and sends id the last call's employee, and is refused with NotAllowed, AR-001.
- **Olga reads her own record, with every field Ada typed.** `olga` (signed in) calls and sends id the last call's employee, and gets back [the world's company, the cast's olga person, `Olga Petrova`, `Female`, `1994-03-17`, `2026-01-05`, the world's department, the world's designation, `active`].

## How to call

```sh
capxul employee get --id <id>
```

HTTP: `POST /employee/get` with the payload as JSON. SDK: `Sdk.employee.get(payload)`.

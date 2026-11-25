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
- **Olga still reads her old record, unchanged but for showing she has left.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the cast's olga person, `Olga Petrova`, `Female`, `1994-03-17`, `2026-01-05`, the world's department, the world's designation, `left`].

### hire an employee

Starts from the world `a team`.

- **Bo can't read Olga's record.** `bo` (signed in) calls and sends id the last call's employee, and is refused with NotAllowed, AR-001.
- **Olga reads her own record, with every field Ada typed.** `olga` (signed in) calls and sends id the last call's employee, and gets back [the world's company, the cast's olga person, `Olga Petrova`, `Female`, `1994-03-17`, `2026-01-05`, the world's department, the world's designation, `active`].
- **Ada reads Bo's record back with every field she typed for him.** `ada` (role company.owner) calls and sends id the last call's employee, and gets back [the world's company, the cast's bo person, `Bo Mensah`, `Male`, `1990-06-01`, `1990-06-01`, the world's department, the world's designation, `active`].

### move an employee through the company

Starts from the world `a new hire`.

- **Dee reads herself back hired, an engineer in Engineering.** `dee` (signed in) calls and sends id the world's newHire, and gets back [the world's company, the cast's dee person, `2026-02-02`, the world's department, the world's designation, `active`].
- **Dee reads herself back a lead engineer, still in Engineering.** `dee` (signed in) calls and sends id the world's newHire, and gets back [the world's company, the world's department, the world's otherDesignation, `active`].
- **Dee reads herself back a lead engineer in Platform.** `dee` (signed in) calls and sends id the world's newHire, and gets back [the world's company, the world's secondDepartment, the world's otherDesignation, `active`].
- **Dee is still at work: the separation didn't relieve her.** `dee` (signed in) calls and sends id the world's newHire, and gets back [the world's secondDepartment, the world's otherDesignation, `active`].
- **Dee reads herself back a lead engineer in Platform who has left.** `dee` (signed in) calls and sends id the world's newHire, and gets back [the world's company, the world's secondDepartment, the world's otherDesignation, `left`].

### promote an employee

Starts from the world `a second transfer`.

- **Olga still reads back an engineer.** `olga` (signed in) calls and sends id the world's employee, and gets back the world's designation.
- **Olga reads herself back a lead engineer, still in Engineering at Acme Trading.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the world's department, the world's otherDesignation, `active`].
- **Olga reads herself back an engineer again, still in Engineering.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the world's department, the world's designation, `active`].
- **Cy reads back a lead engineer who has left.** `ada` (role company.owner) calls and sends id the world's secondEmployee, and gets back [the world's department, the world's otherDesignation, `left`].

### run a separation

Starts from the world `a separation`.

- **Olga is still at work: a separation doesn't relieve her.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the world's department, the world's designation, `active`].

### transfer an employee

Starts from the world `a second transfer`.

- **Olga still reads back in Engineering.** `olga` (signed in) calls and sends id the world's employee, and gets back the world's department.
- **Olga reads herself back in Platform, still an engineer at Acme Trading.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the world's secondDepartment, the world's designation, `active`].
- **Olga reads herself back in Engineering again, still an engineer.** `olga` (signed in) calls and sends id the world's employee, and gets back [the world's company, the world's department, the world's designation, `active`].
- **Cy reads back in Platform, an engineer who has left.** `ada` (role company.owner) calls and sends id the world's secondEmployee, and gets back [the world's secondDepartment, the world's designation, `left`].

## How to call

```sh
capxul employee get --id <id>
```

HTTP: `POST /employee/get` with the payload as JSON. SDK: `Sdk.employee.get(payload)`.

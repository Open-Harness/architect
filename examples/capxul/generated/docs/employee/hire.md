<!-- Generated from the blueprint. Do not edit. -->
# employee.hire

Hire a person into a company, placed in one of its departments under one of its job titles.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

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

## Answer

| field | value |
|---|---|
| employee | employee.id |

## Move

`hire`: from nothing (it creates) to active, emitting EmployeeHired.

## Steps

- `employee.hire.load` (database)
- `employee.hire.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| DepartmentNotInCompany | 42 | EM-002 | declared in errors.ts |
| DesignationNotInCompany | 43 | EM-003 | declared in errors.ts |
| JoinedBeforeBorn | 44 | EM-004 | declared in errors.ts, carrying dateOfBirth |
| EmployeeAlreadyHired | 41 | EM-001 | another active employee holds this company and person; by the rule employee.onePlacePerPerson, carrying person |
| DepartmentNotFound | 4 | DE-901 | nothing has the id in department; the handler never runs; carries `id` |
| DesignationNotFound | 4 | DS-901 | nothing has the id in designation; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### an employee leaves

Starts from the world `an employee`.

- **Ada may hire her again, as a new employee.** `ada` (role company.owner) calls and sends company the world's company, person the cast's olga person, firstName `Olga Petrova`, gender `Female`, dateOfBirth `1994-03-17`, dateOfJoining `2027-02-01`, department the world's department, designation the world's designation, and gets back an answer matching `^emp_[0-9a-z]+$`.

### another company's department is refused

Starts from the world `a team`.

- **Ada can't place Olga in Bo's department.** `ada` (role company.owner) calls and sends company the world's company, person the cast's olga person, firstName `Olga Petrova`, gender `Female`, dateOfBirth `1994-03-17`, dateOfJoining `2026-01-05`, department the last call's department, designation the world's designation, and is refused with DepartmentNotInCompany, EM-002.

### another company's job title is refused

Starts from the world `a team`.

- **Ada can't give Olga Bo's job title.** `ada` (role company.owner) calls and sends company the world's company, person the cast's olga person, firstName `Olga Petrova`, gender `Female`, dateOfBirth `1994-03-17`, dateOfJoining `2026-01-05`, department the world's department, designation the last call's designation, and is refused with DesignationNotInCompany, EM-003.

### hire an employee

Starts from the world `a team`.

- **Ada hires Olga into her team.** `ada` (role company.owner) calls and sends company the world's company, person the cast's olga person, firstName `Olga Petrova`, gender `Female`, dateOfBirth `1994-03-17`, dateOfJoining `2026-01-05`, department the world's department, designation the world's designation, and gets back an answer matching `^emp_[0-9a-z]+$`.
- **Ada can't hire Olga again while she works there.** `ada` (role company.owner) calls and sends company the world's company, person the cast's olga person, firstName `Olga Petrova`, gender `Female`, dateOfBirth `1994-03-17`, dateOfJoining `2026-02-01`, department the world's department, designation the world's designation, and is refused with EmployeeAlreadyHired, EM-001, carrying person the cast's olga person.
- **Bo can't hire anyone into Ada's company.** `bo` (signed in) calls and sends company the world's company, person the cast's bo person, firstName `Bo Mensah`, gender `Male`, dateOfBirth `1990-06-01`, dateOfJoining `2026-01-05`, department the world's department, designation the world's designation, and is refused with NotAllowed, AR-001.
- **Ada can't hire Bo with a joining day before his birthday.** `ada` (role company.owner) calls and sends company the world's company, person the cast's bo person, firstName `Bo Mensah`, gender `Male`, dateOfBirth `1990-06-01`, dateOfJoining `1990-05-31`, department the world's department, designation the world's designation, and is refused with JoinedBeforeBorn, EM-004, carrying dateOfBirth `1990-06-01`.
- **Ada may hire Bo on the day he was born, which ERPNext allows.** `ada` (role company.owner) calls and sends company the world's company, person the cast's bo person, firstName `Bo Mensah`, gender `Male`, dateOfBirth `1990-06-01`, dateOfJoining `1990-06-01`, department the world's department, designation the world's designation, and gets back an answer matching `^emp_[0-9a-z]+$`.

## How to call

```sh
capxul employee hire --company <company> --person <person> --firstName <firstName> --gender <gender> --dateOfBirth <dateOfBirth> --dateOfJoining <dateOfJoining> --department <department> --designation <designation>
```

HTTP: `POST /employee/hire` with the payload as JSON. SDK: `Sdk.employee.hire(payload)`.

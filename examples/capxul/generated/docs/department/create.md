<!-- Generated from the blueprint. Do not edit. -->
# department.create

Add a department to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | department.company |
| departmentName | department.departmentName |

## Answer

| field | value |
|---|---|
| department | department.id |

## Move

`create`: from nothing (it creates) to active, emitting DepartmentCreated.

## Steps

- `department.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| DepartmentNameTaken | 41 | DE-001 | another department holds this company and department name; by the rule department.oneNamePerCompany, carrying departmentName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### another company's department is refused

Starts from the world `a team`.

- **Bo adds Sales to it.** `bo` (signed in) calls and sends company the last call's company, departmentName `Sales`, and gets back an answer matching `^dep_[0-9a-z]+$`.

### set up departments and job titles

Starts from the world `a company`.

- **Ada adds Engineering.** `ada` (role company.owner) calls and sends company the world's company, departmentName `Engineering`, and gets back an answer matching `^dep_[0-9a-z]+$`.
- **Ada can't add a second Engineering.** `ada` (role company.owner) calls and sends company the world's company, departmentName `Engineering`, and is refused with DepartmentNameTaken, DE-001, carrying departmentName `Engineering`.
- **Bo can't add a department to Ada's company.** `bo` (signed in) calls and sends company the world's company, departmentName `Sales`, and is refused with NotAllowed, AR-001.
- **Bo's company may have its own Engineering, because names are unique within a company.** `bo` (signed in) calls and sends company the last call's company, departmentName `Engineering`, and gets back an answer matching `^dep_[0-9a-z]+$`.

## How to call

```sh
capxul department create --company <company> --departmentName <departmentName>
```

HTTP: `POST /department/create` with the payload as JSON. SDK: `Sdk.department.create(payload)`.

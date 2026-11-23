<!-- Generated from the blueprint. Do not edit. -->
# department.get

Read one department by its id: company, departmentName, state.

**Who may call:** the owner of its department.company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | department.id |

## Answer

| field | value |
|---|---|
| company | department.company |
| departmentName | department.departmentName |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its department.company; the handler never runs |

## Worked examples

### set up departments and job titles

Starts from the world `a company`.

- **Bo can't read Ada's department.** `bo` (signed in) calls and sends id the last call's department, and is refused with NotAllowed, AR-001.
- **Ada reads Engineering back.** `ada` (role company.owner) calls and sends id the last call's department, and gets back [the world's company, `Engineering`, `active`].

## How to call

```sh
capxul department get --id <id>
```

HTTP: `POST /department/get` with the payload as JSON. SDK: `Sdk.department.get(payload)`.

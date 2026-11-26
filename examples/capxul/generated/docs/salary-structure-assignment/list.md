<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment.list

List salary-structure-assignments, oldest first, 50 to a page, filtered by employee.

**Who may call:** the owner of its employee.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by employee; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| employee (optional) | salary-structure-assignment.employee |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employee.company; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **Bo can't list Cy's assignments.** `bo` (signed in) calls and sends employee the world's secondEmployee, and is refused with NotAllowed, AR-001.
- **nor can Cy herself.** `cy` (signed in) calls and sends employee the world's secondEmployee, and is refused with NotAllowed, AR-001.
- **Cy's assignments: the first a draft, the second submitted, oldest first.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back [[the world's company, the world's secondEmployee, the world's salaryStructure, `2026-01-12`, `draft`], [the world's company, the world's secondEmployee, the world's salaryStructure, `2026-01-12`, `submitted`]].
- **Ada lists Cy's assignments again.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back 2.
- **Cy's three assignments, the newest a draft.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back [[`2026-01-12`, `submitted`], [`2026-01-12`, `cancelled`], [`2026-02-02`, `draft`]].
- **Olga's assignments: the first, February's, then the June draft.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back 3.
- **Ada lists Olga's assignments.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back 6.
- **Ada lists Olga's assignments again.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back `draft`.

### run a payroll

Starts from the world `an outside cost center`.

- **Olga's assignments: the first, the seniors' structure, the one paying nothing net.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[`2026-01-05`, `submitted`], [`2026-04-01`, `submitted`], [`2026-07-01`, `submitted`]].

## How to call

```sh
capxul salary-structure-assignment list [--employee <employee>] [--cursor <cursor>]
```

HTTP: `POST /salary-structure-assignment/list` with the payload as JSON. SDK: `Sdk.salary-structure-assignment.list(payload)`.

<!-- Generated from the blueprint. Do not edit. -->
# employee-promotion.create

Draft a promotion: an employee's new job title, from a day.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | employee-promotion.company |  |
| employee | employee-promotion.employee |  |
| promotionDate | employee-promotion.promotionDate |  |
| newDesignation | employee-promotion.newDesignation | The job title the employee holds once it is submitted. |

## Answer

| field | value |
|---|---|
| employeePromotion | employee-promotion.id |

## Move

`create`: from nothing (it creates) to draft, emitting EmployeePromotionDrafted.

## Steps

- `employee-promotion.create.load` (database)
- `employee-promotion.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PromotedEmployeeNotInCompany | 41 | PM-001 | declared in errors.ts |
| PromotedEmployeeHasLeft | 42 | PM-002 | declared in errors.ts |
| NewDesignationNotInCompany | 43 | PM-003 | declared in errors.ts |
| DesignationUnchanged | 44 | PM-004 | declared in errors.ts |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| DesignationNotFound | 4 | DS-901 | nothing has the id in newDesignation; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **Ada drafts Dee's promotion to Lead Engineer, from 1 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's newHire, promotionDate `2026-12-01`, newDesignation the world's otherDesignation, and gets back an answer matching `^epr_[0-9a-z]+$`.

### promote an employee

Starts from the world `a second transfer`.

- **Bo can't draft a promotion in Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's secondEmployee, promotionDate `2026-12-01`, newDesignation the world's otherDesignation, and is refused with NotAllowed, AR-001.
- **Ada can't draft Olga's promotion to Lead Engineer again, the title she now holds.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with DesignationUnchanged, PM-004.
- **but she may draft one back to Engineer.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, promotionDate `2026-12-14`, newDesignation the world's designation, and gets back an answer matching `^epr_[0-9a-z]+$`.
- **beside that draft, Ada may draft another back to Engineer from 2 December, a day already past.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, promotionDate `2026-12-02`, newDesignation the world's designation, and gets back an answer matching `^epr_[0-9a-z]+$`.
- **Ada can't draft Olga's promotion to Engineer, the title she holds.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, promotionDate `2026-12-14`, newDesignation the world's designation, and is refused with DesignationUnchanged, PM-004.
- **Ada can't promote Bo in Acme Trading, where he doesn't work.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with PromotedEmployeeNotInCompany, PM-001.
- **nor give Bo, at Acme Logistics, one of Acme Trading's titles.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's outsider, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with NewDesignationNotInCompany, PM-003.
- **Olga in Acme Logistics is refused for the employee's company, which is judged before the title's.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's employee, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with PromotedEmployeeNotInCompany, PM-001.
- **Ada can't promote Bo now he has left, which is judged before the title's company.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's outsider, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with PromotedEmployeeHasLeft, PM-002.
- **in Acme Trading he is refused for the company first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with PromotedEmployeeNotInCompany, PM-001.
- **Ada can't draft a new one for Cy now she has left, which is judged before the title she holds.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, promotionDate `2026-12-14`, newDesignation the world's otherDesignation, and is refused with PromotedEmployeeHasLeft, PM-002.

## How to call

```sh
capxul employee-promotion create --company <company> --employee <employee> --promotionDate <promotionDate> --newDesignation <newDesignation>
```

HTTP: `POST /employee-promotion/create` with the payload as JSON. SDK: `Sdk.employee-promotion.create(payload)`.

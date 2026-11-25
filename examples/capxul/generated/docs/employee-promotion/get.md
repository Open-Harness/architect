<!-- Generated from the blueprint. Do not edit. -->
# employee-promotion.get

Read one employee-promotion by its id: company, employee, promotionDate, currentDesignation, newDesignation, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-promotion.id |

## Answer

| field | value | description |
|---|---|---|
| company | employee-promotion.company |  |
| employee | employee-promotion.employee |  |
| promotionDate | employee-promotion.promotionDate |  |
| currentDesignation | employee-promotion.currentDesignation | The job title the employee held when the promotion was drafted. |
| newDesignation | employee-promotion.newDesignation | The job title the employee holds once it is submitted. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### promote an employee

Starts from the world `a second transfer`.

- **Olga's promotion reads back a draft, from Engineer to Lead Engineer, from 7 December.** `ada` (role company.owner) calls and sends id the world's employeePromotion, and gets back [the world's company, the world's employee, `2026-12-07`, the world's designation, the world's otherDesignation, `draft`].
- **Olga reads her own.** `olga` (signed in) calls and sends id the world's employeePromotion, and gets back [the world's employee, the world's designation, the world's otherDesignation, `draft`].
- **Cy can't read Olga's.** `cy` (signed in) calls and sends id the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **it copied the title she holds now, Lead Engineer.** `ada` (role company.owner) calls and sends id the last call's employeePromotion, and gets back [the world's company, the world's employee, `2026-12-14`, the world's otherDesignation, the world's designation, `draft`].
- **the promotion reads back cancelled, its titles kept.** `ada` (role company.owner) calls and sends id the world's employeePromotion, and gets back [the world's designation, the world's otherDesignation, `cancelled`].

## How to call

```sh
capxul employee-promotion get --id <id>
```

HTTP: `POST /employee-promotion/get` with the payload as JSON. SDK: `Sdk.employee-promotion.get(payload)`.

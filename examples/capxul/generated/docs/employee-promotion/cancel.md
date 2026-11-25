<!-- Generated from the blueprint. Do not edit. -->
# employee-promotion.cancel

Cancel a submitted promotion, putting back the job title it replaced.

**Who may call:** the owner of its employeePromotion.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| employeePromotion | employee-promotion.id |

## Answer

| field | value | description |
|---|---|---|
| employeePromotion | employee-promotion.id |  |
| employee | employee-promotion.employee |  |
| designation | employee-promotion.currentDesignation | The job title the employee held when the promotion was drafted. |

## Move

`cancel`: from submitted to cancelled, emitting EmployeePromotionCancelled.

## Steps

- `employee-promotion.cancel.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EmployeeAlreadyHired | 41 | EM-001 | another active employee holds this company and person; by the rule employee.onePlacePerPerson, carrying person |
| EmployeePromotionNotDraft | 40 | PM-900 | the employee-promotion is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeePromotion.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### promote an employee

Starts from the world `a second transfer`.

- **Ada can't cancel it while it is a draft.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with EmployeePromotionNotDraft, PM-900, carrying state `draft`.
- **Bo can't cancel Olga's first.** `bo` (signed in) calls and sends employeePromotion the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends employeePromotion the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **nor Cy.** `cy` (signed in) calls and sends employeePromotion the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **Ada cancels it, putting back Engineer.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and gets back [the world's employeePromotion, the world's employee, the world's designation].
- **Ada can't cancel it twice.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with EmployeePromotionNotDraft, PM-900, carrying state `cancelled`.
- **Ada still cancels Cy's, drafted before she left, putting back Engineer.** `ada` (role company.owner) calls and sends employeePromotion the world's secondPromotion, and gets back [the world's secondPromotion, the world's secondEmployee, the world's designation].

## How to call

```sh
capxul employee-promotion cancel --employeePromotion <employeePromotion>
```

HTTP: `POST /employee-promotion/cancel` with the payload as JSON. SDK: `Sdk.employee-promotion.cancel(payload)`.

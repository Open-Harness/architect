<!-- Generated from the blueprint. Do not edit. -->
# employee-promotion.submit

Submit a promotion on or after its day, giving the employee the new job title.

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
| designation | employee-promotion.newDesignation | The job title the employee holds once it is submitted. |

## Move

`submit`: from draft to submitted, emitting EmployeePromoted.

## Steps

- `employee-promotion.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PromotionNotYetDue | 45 | PM-005 | declared in errors.ts, carrying promotionDate |
| EmployeeAlreadyHired | 41 | EM-001 | another active employee holds this company and person; by the rule employee.onePlacePerPerson, carrying person |
| EmployeePromotionNotDraft | 40 | PM-900 | the employee-promotion is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its employeePromotion.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **and submits it.** `ada` (role company.owner) calls and sends employeePromotion the last call's employeePromotion, and gets back [the world's newHire, the world's otherDesignation].

### promote an employee

Starts from the world `a second transfer`.

- **Ada can't submit Olga's before its day.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with PromotionNotYetDue, PM-005, carrying promotionDate `2026-12-07`.
- **Bo can't submit it.** `bo` (signed in) calls and sends employeePromotion the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **nor can Olga submit her own.** `olga` (signed in) calls and sends employeePromotion the world's employeePromotion, and is refused with NotAllowed, AR-001.
- **Ada still can't submit it.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with PromotionNotYetDue, PM-005, carrying promotionDate `2026-12-07`.
- **Ada submits it on the day itself.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and gets back [the world's employeePromotion, the world's employee, the world's otherDesignation].
- **Ada can't submit it twice.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with EmployeePromotionNotDraft, PM-900, carrying state `submitted`.
- **nor submit it again.** `ada` (role company.owner) calls and sends employeePromotion the world's employeePromotion, and is refused with EmployeePromotionNotDraft, PM-900, carrying state `cancelled`.
- **Ada still submits Cy's promotion, drafted before she left.** `ada` (role company.owner) calls and sends employeePromotion the world's secondPromotion, and gets back [the world's secondPromotion, the world's secondEmployee, the world's otherDesignation].

## How to call

```sh
capxul employee-promotion submit --employeePromotion <employeePromotion>
```

HTTP: `POST /employee-promotion/submit` with the payload as JSON. SDK: `Sdk.employee-promotion.submit(payload)`.

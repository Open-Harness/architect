<!-- Generated from the blueprint. Do not edit. -->
# employee-feedback-criteria.create

Add something a company rates its people on.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | employee-feedback-criteria.company |
| criteria | employee-feedback-criteria.criteria |

## Answer

| field | value |
|---|---|
| employeeFeedbackCriteria | employee-feedback-criteria.id |

## Move

`create`: from nothing (it creates) to active, emitting FeedbackCriteriaCreated.

## Steps

- `employee-feedback-criteria.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CriteriaNameTaken | 41 | FC-001 | another employee feedback criteria holds this company and criteria; by the rule employee-feedback-criteria.oneNamePerCompany, carrying criteria |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up kras and criteria

Starts from the world `three companies`.

- **Ada adds the criteria Problem Solving to Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, criteria `Problem Solving`, and gets back an answer matching `^efc_[0-9a-z]+$`.
- **a name in lower case is kept as typed.** `ada` (role company.owner) calls and sends company the world's company, criteria `teamwork`, and gets back an answer matching `^efc_[0-9a-z]+$`.
- **the same criteria can't be added to Acme Trading twice.** `ada` (role company.owner) calls and sends company the world's company, criteria `Problem Solving`, and is refused with CriteriaNameTaken, FC-001, carrying criteria `Problem Solving`.
- **but Acme Logistics may have its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, criteria `Problem Solving`, and gets back an answer matching `^efc_[0-9a-z]+$`.
- **Bo can't add criteria to Acme Trading.** `bo` (signed in) calls and sends company the world's company, criteria `Speed`, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul employee-feedback-criteria create --company <company> --criteria <criteria>
```

HTTP: `POST /employee-feedback-criteria/create` with the payload as JSON. SDK: `Sdk.employee-feedback-criteria.create(payload)`.

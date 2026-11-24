<!-- Generated from the blueprint. Do not edit. -->
# employment-type.create

Add a way a company employs people.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | employment-type.company |
| employmentTypeName | employment-type.employmentTypeName |

## Answer

| field | value |
|---|---|
| employmentType | employment-type.id |

## Move

`create`: from nothing (it creates) to active, emitting EmploymentTypeCreated.

## Steps

- `employment-type.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EmploymentTypeNameTaken | 41 | TY-001 | another employment type holds this company and employment type name; by the rule employment-type.oneNamePerCompany, carrying employmentTypeName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up employment types

Starts from the world `three companies`.

- **Ada adds an employment type to Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, employmentTypeName `Full-time`, and gets back an answer matching `^ety_[0-9a-z]+$`.
- **Ada adds a second one.** `ada` (role company.owner) calls and sends company the world's company, employmentTypeName `Contract`, and gets back an answer matching `^ety_[0-9a-z]+$`.
- **a name in lower case is kept as typed.** `ada` (role company.owner) calls and sends company the world's company, employmentTypeName `apprentice`, and gets back an answer matching `^ety_[0-9a-z]+$`.
- **the first name can't be added to Acme Trading twice.** `ada` (role company.owner) calls and sends company the world's company, employmentTypeName `Full-time`, and is refused with EmploymentTypeNameTaken, TY-001, carrying employmentTypeName `Full-time`.
- **Bo can't add a type to Ada's company.** `bo` (signed in) calls and sends company the world's company, employmentTypeName `Intern`, and is refused with NotAllowed, AR-001.
- **Acme Logistics may have one of that name of its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, employmentTypeName `Full-time`, and gets back an answer matching `^ety_[0-9a-z]+$`.
- **Bo adds one of that name to Bo Ltd.** `bo` (signed in) calls and sends company the world's boCompany, employmentTypeName `Full-time`, and gets back an answer matching `^ety_[0-9a-z]+$`.

## How to call

```sh
capxul employment-type create --company <company> --employmentTypeName <employmentTypeName>
```

HTTP: `POST /employment-type/create` with the payload as JSON. SDK: `Sdk.employment-type.create(payload)`.

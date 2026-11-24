<!-- Generated from the blueprint. Do not edit. -->
# expense-claim-type.create

Add a kind of expense a company pays back.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | expense-claim-type.company |
| expenseType | expense-claim-type.expenseType |

## Answer

| field | value |
|---|---|
| expenseClaimType | expense-claim-type.id |

## Move

`create`: from nothing (it creates) to active, emitting ExpenseClaimTypeCreated.

## Steps

- `expense-claim-type.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ExpenseTypeTaken | 41 | ET-001 | another expense claim type holds this company and expense type; by the rule expense-claim-type.oneNamePerCompany, carrying expenseType |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### expense claims stay in their company

Starts from the world `an expense claim`.

- **Bo adds an expense type to it.** `bo` (signed in) calls and sends company the last call's company, expenseType `Travel`, and gets back an answer matching `^ect_[0-9a-z]+$`.
- **Bo adds Lunches to it.** `bo` (signed in) calls and sends company the last call's company, expenseType `Lunches`, and gets back an answer matching `^ect_[0-9a-z]+$`.

### set up expense types

Starts from the world `a company`.

- **Ada adds Travel.** `ada` (role company.owner) calls and sends company the world's company, expenseType `Travel`, and gets back an answer matching `^ect_[0-9a-z]+$`.
- **a second type can't take its name.** `ada` (role company.owner) calls and sends company the world's company, expenseType `Travel`, and is refused with ExpenseTypeTaken, ET-001, carrying expenseType `Travel`.
- **Ada adds Calls, which is its own type.** `ada` (role company.owner) calls and sends company the world's company, expenseType `Calls`, and gets back an answer matching `^ect_[0-9a-z]+$`.
- **Bo can't add a type to Ada's company.** `bo` (signed in) calls and sends company the world's company, expenseType `Bo's lunches`, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul expense-claim-type create --company <company> --expenseType <expenseType>
```

HTTP: `POST /expense-claim-type/create` with the payload as JSON. SDK: `Sdk.expense-claim-type.create(payload)`.

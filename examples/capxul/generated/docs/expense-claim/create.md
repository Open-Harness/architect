<!-- Generated from the blueprint. Do not edit. -->
# expense-claim.create

Start an employee's claim for expenses the company pays back.

**Who may call:** the self of its employee, or the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | expense-claim.company |
| employee | expense-claim.employee |
| postingDate | expense-claim.postingDate |

## Answer

| field | value |
|---|---|
| expenseClaim | expense-claim.id |

## Move

`create`: from nothing (it creates) to draft, emitting ExpenseClaimCreated.

## Steps

- `expense-claim.create.load` (database)
- `expense-claim.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ClaimantNotActive | 41 | EC-001 | declared in errors.ts |
| EmployeeNotInCompany | 42 | EC-002 | declared in errors.ts |
| CompanyNotFound | 4 | CO-901 | nothing has the id in company; the handler never runs; carries `id` |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### claim expenses

Starts from the world `an expense type`.

- **Olga starts a claim of her own.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, postingDate `2026-11-20`, and gets back an answer matching `^ecl_[0-9a-z]+$`.
- **Bo can't start a claim for Olga.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, postingDate `2026-11-20`, and is refused with NotAllowed, AR-001.

### expense claims stay in their company

Starts from the world `an expense claim`.

- **Bo can't file a claim in his company for Olga, who works for Ada.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, postingDate `2026-11-20`, and is refused with EmployeeNotInCompany, EC-002.
- **a claim can't be started for an employee who has left.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, postingDate `2026-12-01`, and is refused with ClaimantNotActive, EC-001.

## How to call

```sh
capxul expense-claim create --company <company> --employee <employee> --postingDate <postingDate>
```

HTTP: `POST /expense-claim/create` with the payload as JSON. SDK: `Sdk.expense-claim.create(payload)`.

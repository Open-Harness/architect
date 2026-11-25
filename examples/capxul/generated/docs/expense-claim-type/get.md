<!-- Generated from the blueprint. Do not edit. -->
# expense-claim-type.get

Read one expense-claim-type by its id: company, expenseType, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | expense-claim-type.id |

## Answer

| field | value |
|---|---|
| company | expense-claim-type.company |
| expenseType | expense-claim-type.expenseType |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up expense types

Starts from the world `a company`.

- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's expenseClaimType, and gets back [the world's company, `Travel`, `active`].
- **Bo can't read Ada's type.** `bo` (signed in) calls and sends id the last call's expenseClaimType, and is refused with NotAllowed, AR-001.
- **Calls reads back as Calls.** `ada` (role company.owner) calls and sends id the last call's expenseClaimType, and gets back [the world's company, `Calls`, `active`].

## How to call

```sh
capxul expense-claim-type get --id <id>
```

HTTP: `POST /expense-claim-type/get` with the payload as JSON. SDK: `Sdk.expense-claim-type.get(payload)`.

# CX-currency: a currency a row holds (#882, part one)

24 November 2026, Goal 16's lead. Claimed under K42 §3, case 3 (#882).

## The call

ERPNext keeps a currency on the row: a Company's `default_currency`, a Sales Invoice's `currency`, a GL Entry's
`account_currency`, and every amount of an Expense Claim is Currency in the company's currency. M6-money lets an amount
count a fixed asset or the token an `account()` field of its row holds. Part one adds the second kind of holder:

- `Blueprint.currency()` is a value: an ISO 4217 code that `placesOf` knows (the same table the compiler checks
  `Blueprint.asset.currency` against), with its own meta, `{ type: "currency" }`, and its own kind in the refusals lock.
- `Blueprint.money.of(currency)` takes a currency field as it takes an `account()` field. The model records the
  amount's asset as `{ field: "<name>" }`, as for a token. Amounts stay in base units (CX-grill, section 3), the places
  coming from the code.

**Part two** is exchange rates: a rate is an exact decimal (#742, item 5) held on a day (`dates`, landed by #917), and
converting between a row's currency and the company's. Its checks come after part one is built.

**Not covered here:** a chain-stored thing with a currency field. A currency has no chain binding (M6-money refusal b),
and the refusal of a currency field on a chain store comes with part two's checks.

## Evidence

- `packages/compiler/src/modules/model/internal/money.ts`: today only an `account()` field holds an asset.
- `design/later.md` and `M6-money.md`: "a currency taken from a field on the row … later".
- Checks: `packages/orthograph/src/modules/values/currency.test.ts`, `packages/compiler/src/modules/model/money-currency.test.ts`.

## Supersedes

- design/later.md: "a currency taken from a field on the row, and the portal's formatting, are later." → "a currency taken from a field on the row is CX-currency (#882), and the portal's formatting is later."

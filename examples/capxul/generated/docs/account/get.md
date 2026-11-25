<!-- Generated from the blueprint. Do not edit. -->
# account.get

Read one account by its id: company, accountName, parentAccount, rootType, reportType, accountType, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | account.id |

## Answer

| field | value |
|---|---|
| company | account.company |
| accountName | account.accountName |
| parentAccount (optional) | account.parentAccount |
| rootType | account.rootType |
| reportType | account.reportType |
| accountType (optional) | account.accountType |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up a chart of accounts

Starts from the world `a chart`.

- **Bank reads back a ledger of the type Bank under Assets, on the Balance Sheet.** `ada` (role company.owner) calls and sends id the world's bank, and gets back [the world's company, `Bank`, the world's assets, `Asset`, `Balance Sheet`, `Bank`, `ledger`].
- **Assets reads back a root group with no parent and no type.** `ada` (role company.owner) calls and sends id the world's assets, and gets back [the world's company, `Assets`, null, `Asset`, `Balance Sheet`, null, `group`].
- **Rent, two groups below Expenses, carries Expense, in Profit and Loss.** `ada` (role company.owner) calls and sends id the world's rent, and gets back [the world's company, `Rent`, the world's operating, `Expense`, `Profit and Loss`, null, `ledger`].
- **Bo can't read Bank.** `bo` (signed in) calls and sends id the world's bank, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's account, and gets back [the world's company, `Cash`, the world's assets, `Asset`, `Balance Sheet`, `Cash`, `ledger`].
- **and reads back a Payable ledger, Liability.** `ada` (role company.owner) calls and sends id the last call's account, and gets back [`Creditors`, `Liability`, `Payable`, `ledger`].
- **it reads back a ledger, everything else as it was.** `ada` (role company.owner) calls and sends id the last call's account, and gets back [the world's company, `Prepayments`, the world's assets, `Asset`, `Balance Sheet`, null, `ledger`].
- **the group above Rent still reads back a group.** `ada` (role company.owner) calls and sends id the world's operating, and gets back [the world's company, `Operating Expenses`, the world's expenses, `Expense`, `Profit and Loss`, null, `group`].

## How to call

```sh
capxul account get --id <id>
```

HTTP: `POST /account/get` with the payload as JSON. SDK: `Sdk.account.get(payload)`.

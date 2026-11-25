<!-- Generated from the blueprint. Do not edit. -->
# account.create

Add an account to a company's chart, under a group or as a root.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | account.company |  |
| accountName | account.accountName |  |
| parentAccount (optional) | account.parentAccount |  |
| isGroup | YesNo | Make it a group, which other accounts sit under, rather than a ledger, which takes entries. |
| rootType (optional) | account.rootType |  |
| accountType (optional) | account.accountType |  |

## Answer

| field | value |
|---|---|
| account | account.id |
| rootType | account.rootType |
| reportType | account.reportType |

## Move

`create`: from nothing (it creates) to group or ledger, emitting AccountCreated.

## Steps

- `account.create.load` (database)
- `account.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ParentAccountNotInCompany | 41 | AC-001 | declared in errors.ts |
| ParentAccountIsLedger | 42 | AC-002 | declared in errors.ts |
| RootAccountIsLedger | 43 | AC-003 | declared in errors.ts |
| RootTypeMissing | 44 | AC-004 | declared in errors.ts |
| RootTypeNotParents | 45 | AC-005 | declared in errors.ts, carrying rootType |
| AccountNameTaken | 47 | AC-007 | another account holds this company and account name; by the rule account.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **Ada starts Acme Logistics' chart with a root group.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Expenses`, isGroup true, rootType `Expense`, and is answered.
- **and a ledger under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Wages`, parentAccount the last call's account, isGroup false, and is answered.

### draft a journal entry

Starts from the world `a fiscal year`.

- **Ada adds Acme Logistics' Assets group.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Assets`, isGroup true, rootType `Asset`, and gets back an answer matching `^acc_`.
- **and its Bank ledger under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Bank`, parentAccount the last call's account, isGroup false, accountType `Bank`, and gets back an answer matching `^acc_`.

### keep the books

Starts from the world `a chart`.

- **Ada adds a second ledger under Assets, beside Bank.** `ada` (role company.owner) calls and sends company the world's company, accountName `Float`, parentAccount the world's assets, isGroup false, and gets back an answer matching `^acc_[0-9a-z]+$`.

### run a payroll

Starts from the world `an outside cost center`.

- **Ada adds another ledger under Liabilities, typed as owed to suppliers.** `ada` (role company.owner) calls and sends company the world's company, accountName `Trade Creditors`, parentAccount the world's liabilities, isGroup false, accountType `Payable`, and is answered.
- **Ada adds a group under Liabilities, typed as owed to suppliers.** `ada` (role company.owner) calls and sends company the world's company, accountName `Accrued Liabilities`, parentAccount the world's liabilities, isGroup true, accountType `Payable`, and is answered.

### set up a chart of accounts

Starts from the world `a chart`.

- **nor add an account to Acme Trading's chart.** `bo` (signed in) calls and sends company the world's company, accountName `Cash`, parentAccount the world's assets, isGroup false, and is refused with NotAllowed, AR-001.
- **Ada adds Cash under Assets, of the type Cash, naming no root type: it takes Asset.** `ada` (role company.owner) calls and sends company the world's company, accountName `Cash`, parentAccount the world's assets, isGroup false, accountType `Cash`, and gets back an answer matching `^acc_[0-9a-z]+$` and gets back [`Asset`, `Balance Sheet`].
- **a root group of the root type Liability is on the Balance Sheet.** `ada` (role company.owner) calls and sends company the world's company, accountName `Liabilities`, isGroup true, rootType `Liability`, and gets back [`Liability`, `Balance Sheet`].
- **a Payable ledger under it carries Liability.** `ada` (role company.owner) calls and sends company the world's company, accountName `Creditors`, parentAccount the last call's account, isGroup false, accountType `Payable`, and gets back [`Liability`, `Balance Sheet`].
- **an Income root group is in Profit and Loss.** `ada` (role company.owner) calls and sends company the world's company, accountName `Income`, isGroup true, rootType `Income`, and gets back [`Income`, `Profit and Loss`].
- **a child may name its parent's root type: a Tax ledger beside Rent, Expense.** `ada` (role company.owner) calls and sends company the world's company, accountName `Utilities`, parentAccount the world's operating, isGroup false, rootType `Expense`, accountType `Tax`, and gets back [`Expense`, `Profit and Loss`].
- **a child under Equity carries Equity, on the Balance Sheet.** `ada` (role company.owner) calls and sends company the world's company, accountName `Retained Earnings`, parentAccount the world's equity, isGroup false, and gets back [`Equity`, `Balance Sheet`].
- **an account under a ledger is refused.** `ada` (role company.owner) calls and sends company the world's company, accountName `Petty Cash`, parentAccount the world's bank, isGroup false, and is refused with ParentAccountIsLedger, AC-002.
- **and so is a group under one, naming another root type: the parent is judged first.** `ada` (role company.owner) calls and sends company the world's company, accountName `Petty Cash`, parentAccount the world's rent, isGroup true, rootType `Income`, and is refused with ParentAccountIsLedger, AC-002.
- **a root that isn't a group is refused.** `ada` (role company.owner) calls and sends company the world's company, accountName `Suspense`, isGroup false, rootType `Asset`, and is refused with RootAccountIsLedger, AC-003.
- **even with no root type: its being a ledger is judged first.** `ada` (role company.owner) calls and sends company the world's company, accountName `Suspense`, isGroup false, and is refused with RootAccountIsLedger, AC-003.
- **a root group must name its root type.** `ada` (role company.owner) calls and sends company the world's company, accountName `Suspense`, isGroup true, and is refused with RootTypeMissing, AC-004.
- **a child naming another root type than its parent's is refused, carrying the parent's.** `ada` (role company.owner) calls and sends company the world's company, accountName `Loans`, parentAccount the world's assets, isGroup false, rootType `Liability`, and is refused with RootTypeNotParents, AC-005, carrying rootType `Asset`.
- **two levels down too: under Rent's group it carries Expense.** `ada` (role company.owner) calls and sends company the world's company, accountName `Sales`, parentAccount the world's operating, isGroup true, rootType `Income`, and is refused with RootTypeNotParents, AC-005, carrying rootType `Expense`.
- **a second Bank is refused, under any parent.** `ada` (role company.owner) calls and sends company the world's company, accountName `Bank`, parentAccount the world's equity, isGroup false, and is refused with AccountNameTaken, AC-007.
- **and at the root.** `ada` (role company.owner) calls and sends company the world's company, accountName `Rent`, isGroup true, rootType `Expense`, and is refused with AccountNameTaken, AC-007.
- **a taken name under a ledger is refused for the ledger first.** `ada` (role company.owner) calls and sends company the world's company, accountName `Cash`, parentAccount the world's bank, isGroup false, and is refused with ParentAccountIsLedger, AC-002.
- **Ada starts Acme Logistics' chart with its own Assets: the name is that company's to use.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Assets`, isGroup true, rootType `Asset`, and gets back [`Asset`, `Balance Sheet`].
- **an Acme Trading account under Acme Logistics' Assets is refused.** `ada` (role company.owner) calls and sends company the world's company, accountName `Float`, parentAccount the last call's account, isGroup false, and is refused with ParentAccountNotInCompany, AC-001.
- **Acme Logistics adds its own Bank under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Bank`, parentAccount the last call's account, isGroup false, accountType `Bank`, and gets back `Asset`.
- **an Acme Trading account under that ledger, naming another root type, is refused for the company first.** `ada` (role company.owner) calls and sends company the world's company, accountName `Float`, parentAccount the last call's account, isGroup false, rootType `Income`, and is refused with ParentAccountNotInCompany, AC-001.
- **Ada adds an empty group under Assets.** `ada` (role company.owner) calls and sends company the world's company, accountName `Prepayments`, parentAccount the world's assets, isGroup true, and is answered.

### set up salary components

Starts from the world `a salaries ledger`.

- **Ada starts Acme Logistics' chart with a root group.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Expenses`, isGroup true, rootType `Expense`, and is answered.
- **and a ledger under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Wages`, parentAccount the last call's account, isGroup false, and is answered.

### set up salary structures

Starts from the world `a pension component`.

- **Ada starts Acme Logistics' chart with a root group.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Expenses`, isGroup true, rootType `Expense`, and is answered.
- **and a ledger under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, accountName `Wages`, parentAccount the last call's account, isGroup false, and is answered.

## How to call

```sh
capxul account create --company <company> --accountName <accountName> [--parentAccount <parentAccount>] --isGroup <isGroup> [--rootType <rootType>] [--accountType <accountType>]
```

HTTP: `POST /account/create` with the payload as JSON. SDK: `Sdk.account.create(payload)`.

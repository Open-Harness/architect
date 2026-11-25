<!-- Generated from the blueprint. Do not edit. -->
# account

A heading in a company's chart of accounts: a group of accounts, or a ledger that takes entries.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| accountName | Name |
| parentAccount (optional) | account.id |
| rootType | RootType |
| reportType | ReportType |
| accountType (optional) | schema |

## Machine

States: group, ledger. A move from the wrong state is refused AccountNotGroup (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | group, ledger | AccountCreated |
| makeLedger | group | ledger | AccountMadeLedger |

## Invariants

- `account.oneNamePerCompany`: another account holds this company and account name. Unique on company, accountName, in every state; refused AccountNameTaken.

## Events

- `AccountCreated`: carries account (account.id), company (account.company), rootType (account.rootType); emitted by the move create
- `AccountMadeLedger`: carries account (account.id); emitted by the move makeLedger

## Operations

- [account.balance](balance.md): An account's balance on a day: its own ledger lines and those of every account under it.
- [account.create](create.md): Add an account to a company's chart, under a group or as a root.
- [account.get](get.md): Read one account by its id: company, accountName, parentAccount, rootType, reportType, accountType, state.
- [account.make-ledger](make-ledger.md): Turn a group account with nothing under it into a ledger.

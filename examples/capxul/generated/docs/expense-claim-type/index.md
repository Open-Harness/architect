<!-- Generated from the blueprint. Do not edit. -->
# expense-claim-type

A kind of expense a company pays back, such as travel.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| expenseType | ExpenseTypeName |

## Machine

States: active. A move from the wrong state is refused ExpenseClaimTypeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | ExpenseClaimTypeCreated |

## Invariants

- `expense-claim-type.oneNamePerCompany`: another expense claim type holds this company and expense type. Unique on company, expenseType, in every state; refused ExpenseTypeTaken.

## Events

- `ExpenseClaimTypeCreated`: carries expenseClaimType (expense-claim-type.id), company (expense-claim-type.company); emitted by the move create

## Operations

- [expense-claim-type.create](create.md): Add a kind of expense a company pays back.
- [expense-claim-type.get](get.md): Read one expense-claim-type by its id: company, expenseType, state.

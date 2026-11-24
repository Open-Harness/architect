<!-- Generated from the blueprint. Do not edit. -->
# expense

One expense in a claim.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| expenseClaim | expense-claim.id |
| expenseDate | Day |
| expenseType | expense-claim-type.id |
| amount | Amount |
| sanctionedAmount | Amount |

## Machine

States: active. A move from the wrong state is refused ExpenseNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | active | ExpenseAdded |

## Events

- `ExpenseAdded`: carries expense (expense.id), expenseClaim (expense.expenseClaim), amount (expense.amount), totalClaimedAmount (expense-claim.totalClaimedAmount); emitted by the move add

## Operations

- [expense.add](add.md): Add one expense to a claim still in draft.
- [expense.get](get.md): Read one expense by its id: expenseClaim, expenseDate, expenseType, amount, sanctionedAmount, state.

<!-- Generated from the blueprint. Do not edit. -->
# expense-claim

What an employee asks the company to pay back.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employee | employee.id |
| postingDate | Day |
| totalClaimedAmount | Amount |
| totalSanctionedAmount | Amount |

## Machine

States: draft, approved, rejected. A move from the wrong state is refused ExpenseClaimNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | ExpenseClaimCreated |
| approve | draft | approved | ExpenseClaimApproved |
| reject | draft | rejected | ExpenseClaimRejected |

## Events

- `ExpenseClaimApproved`: carries expenseClaim (expense-claim.id), totalSanctionedAmount (expense-claim.totalSanctionedAmount); emitted by the move approve
- `ExpenseClaimCreated`: carries expenseClaim (expense-claim.id), company (expense-claim.company), employee (expense-claim.employee); emitted by the move create
- `ExpenseClaimRejected`: carries expenseClaim (expense-claim.id); emitted by the move reject

## Operations

- [expense-claim.approve](approve.md): Approve a claim, owing the employee what was sanctioned.
- [expense-claim.create](create.md): Start an employee's claim for expenses the company pays back.
- [expense-claim.get](get.md): Read one expense-claim by its id: company, employee, postingDate, totalClaimedAmount, totalSanctionedAmount, state.
- [expense-claim.reject](reject.md): Reject a claim, so nothing of it is paid back.

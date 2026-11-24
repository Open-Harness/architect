import { Blueprint } from "orthograph";
import { Expense } from "../thing.ts";
import { machine } from "../machine.ts";
import { ClaimNotDraft, ExpenseTypeNotInCompany, SanctionedOverClaimed } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { ExpenseClaim } from "../../expense-claim/thing.ts";

// HRMS's `calculate_total_amount`: a claim's totals are its expenses' amounts and sanctioned amounts, so adding an
// expense raises both.
export default Blueprint.operation(Expense, {
  description: "Add one expense to a claim still in draft.",
  payload: {
    expenseClaim: Expense.fields.expenseClaim,
    expenseDate: Expense.fields.expenseDate,
    expenseType: Expense.fields.expenseType,
    amount: Expense.fields.amount,
    sanctionedAmount: Expense.fields.sanctionedAmount,
  },
  answer: {
    expense: Expense.fields.id,
    totalClaimedAmount: ExpenseClaim.fields.totalClaimedAmount,
    totalSanctionedAmount: ExpenseClaim.fields.totalSanctionedAmount,
  },
  move: machine.moves.add,
  errors: [SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft],
  allowed: [owner.of("expenseClaim.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database({ writes: [Expense, ExpenseClaim] }) },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

import { Blueprint } from "orthograph";
import { Expense } from "./thing.ts";
import { ExpenseClaim } from "../expense-claim/thing.ts";

export const ExpenseAdded = Blueprint.event({
  expense: Expense.fields.id,
  expenseClaim: Expense.fields.expenseClaim,
  amount: Expense.fields.amount,
  totalClaimedAmount: ExpenseClaim.fields.totalClaimedAmount,
});

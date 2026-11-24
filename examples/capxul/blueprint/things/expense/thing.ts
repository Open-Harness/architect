import { Blueprint } from "orthograph";
import { ExpenseClaim } from "../expense-claim/thing.ts";
import { ExpenseClaimType } from "../expense-claim-type/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";

// HRMS's Expense Claim Detail, the child table of an Expense Claim (hrms/hr/doctype/expense_claim_detail): one row per
// expense, in USDC. Its cost centre and account come with the books (slice 7).
export const Expense = Blueprint.thing({
  description: "One expense in a claim.",
  code: "EX",
  fields: {
    id: Blueprint.id("exp"),
    expenseClaim: ExpenseClaim.fields.id,
    expenseDate: Day,
    expenseType: ExpenseClaimType.fields.id,
    amount: Amount,
    sanctionedAmount: Amount,
  },
});

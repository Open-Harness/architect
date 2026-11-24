import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";

// HRMS's Expense Claim (hrms/hr/doctype/expense_claim): its required fields and its two totals, in USDC (CX-grill,
// section 3). Its child table of expenses is the thing Expense, one row per expense. Its approver, taxes, advances and
// the accounts it posts to come with the books (slice 7); paying it back comes with getting paid (slice 2).
export const ExpenseClaim = Blueprint.thing({
  description: "What an employee asks the company to pay back.",
  code: "EC",
  fields: {
    id: Blueprint.id("ecl"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    postingDate: Day,
    totalClaimedAmount: Amount,
    totalSanctionedAmount: Amount,
  },
});

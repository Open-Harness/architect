import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { ExpenseTypeName } from "../../values/expenses.ts";

// HRMS's Expense Claim Type (hrms/hr/doctype/expense_claim_type): its name. HRMS names a type across a site and keeps
// an account per company in a child table; Capxul's companies are separate organisations (K42, call 10), so each keeps
// its own types. The accounts come with the books (slice 7).
export const ExpenseClaimType = Blueprint.thing({
  description: "A kind of expense a company pays back, such as travel.",
  code: "ET",
  fields: {
    id: Blueprint.id("ect"),
    company: Company.fields.id,
    expenseType: ExpenseTypeName,
  },
});

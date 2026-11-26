import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Account } from "../account/thing.ts";
import { Amount } from "../../values/expenses.ts";
import { ComponentName, ComponentType } from "../../values/payroll.ts";

// HRMS's Salary Component (hrms/payroll/doctype/salary_component): its name, whether it is an earning or a deduction,
// the amount a structure line takes when it names none (HRMS's `amount`, copied by Salary Structure's
// `set_missing_values`), and the ledger its pay is booked to. HRMS keeps a component for the whole site and its account
// per company in a child table (Salary Component Account); Capxul's companies are separate organisations (K42, call 10),
// so each keeps its own components, each with one account. The abbreviation, the condition and the formula are left out
// with formulas, and the tax, benefit, payment-days and statistical flags with the slices that read them
// (`decisions/CX-payroll.md`).
export const SalaryComponent = Blueprint.thing({
  description: "A part of an employee's pay: an earning, such as basic pay, or a deduction, such as a pension contribution.",
  code: "SC",
  fields: {
    id: Blueprint.id("scp"),
    company: Company.fields.id,
    salaryComponent: ComponentName,
    type: ComponentType,
    amount: Blueprint.described(Amount, "What a structure line pays when it names no amount of its own, in USDC base units. 0 for none."),
    account: Blueprint.described(Account.fields.id, "The company's ledger its pay is booked to: debited for an earning, credited for a deduction."),
  },
});

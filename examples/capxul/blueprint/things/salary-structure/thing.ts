import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Amount } from "../../values/expenses.ts";
import { Balance } from "../../values/ledger.ts";
import { StructureName } from "../../values/payroll.ts";

// HRMS's Salary Structure (hrms/payroll/doctype/salary_structure), submittable: its name and company, and the totals of
// its lines (`total_earning`, `total_deduction`, `net_pay`, which HRMS's form works out), in USDC base units. Its lines
// are Salary Detail rows. The net pay is signed, as a draft may hold more deductions than earnings; submitting refuses
// that. The pay frequency (always monthly here), `is_active`, the timesheet, benefit, leave-encashment and payment
// fields, and its currency (every amount is USDC, CX-grill section 3) are left out (`decisions/CX-payroll.md`).
export const SalaryStructure = Blueprint.thing({
  description: "A company's pay for a kind of role: the earnings and deductions each employee assigned to it is paid.",
  code: "SS",
  fields: {
    id: Blueprint.id("sst"),
    company: Company.fields.id,
    salaryStructureName: StructureName,
    totalEarning: Amount,
    totalDeduction: Amount,
    netPay: Blueprint.described(Balance, "Its earnings less its deductions, in USDC base units."),
  },
});

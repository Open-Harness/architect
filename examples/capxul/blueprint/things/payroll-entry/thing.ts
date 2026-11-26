import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Account } from "../account/thing.ts";
import { CostCenter } from "../cost-center/thing.ts";
import { Day } from "../../values/employee.ts";
import { EmployeeCount } from "../../values/payroll.ts";

// HRMS's Payroll Entry (hrms/payroll/doctype/payroll_entry), submittable: one pay run of a company for a typed span of
// days, with the day its accrual is posted, the cost center it is booked in, and the ledger the net pay is owed on
// (`payroll_payable_account`). Its employees are Payroll Employee Detail rows, filled in when it is made. The pay
// frequency, the branch, department, designation and grade filters, the attendance check, the currency and exchange
// rate, the bank entry and the tax flags are left out (`decisions/CX-payroll.md`).
export const PayrollEntry = Blueprint.thing({
  description: "A company's pay run for a span of days: its employees' salary slips, and the journal entry that books them.",
  code: "PE",
  fields: {
    id: Blueprint.id("pay"),
    company: Company.fields.id,
    postingDate: Blueprint.described(Day, "The day its salary slips and accrual journal entry are posted."),
    startDate: Day,
    endDate: Day,
    costCenter: CostCenter.fields.id,
    payrollPayableAccount: Blueprint.described(Account.fields.id, "The ledger the net pay is credited to, owed to the employees until it is paid."),
    numberOfEmployees: EmployeeCount,
  },
});

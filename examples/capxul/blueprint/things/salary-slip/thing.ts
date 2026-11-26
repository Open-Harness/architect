import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { PayrollEntry } from "../payroll-entry/thing.ts";
import { SalaryStructure } from "../salary-structure/thing.ts";
import { JournalEntry } from "../journal-entry/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";
import { Balance } from "../../values/ledger.ts";
import { SlipStatus } from "../../values/payroll.ts";

// HRMS's Salary Slip (hrms/payroll/doctype/salary_slip): one employee's pay for a payroll entry's days, from the
// structure of their assignment, in USDC base units. Its lines are Salary Slip Detail rows. Only its payroll entry's
// submit makes one and its submit-slips submits it (writes, CX-takeover), so it has no machine and no operation of its
// own: `status` is HRMS's `status` field, Draft or Submitted. `journalEntry` is set once the accrual books it. Payment
// days, leave without pay, timesheets, loans, tax, year-to-date figures and the currency columns are left out
// (`decisions/CX-payroll.md`).
export const SalarySlip = Blueprint.thing({
  description: "One employee's pay for a payroll entry's days: their earnings, deductions and net pay.",
  code: "SL",
  fields: {
    id: Blueprint.id("sal"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    payrollEntry: PayrollEntry.fields.id,
    salaryStructure: SalaryStructure.fields.id,
    postingDate: Day,
    startDate: Day,
    endDate: Day,
    grossPay: Amount,
    totalDeduction: Amount,
    netPay: Blueprint.described(Balance, "Its gross pay less its total deduction, in USDC base units."),
    status: SlipStatus,
    journalEntry: Blueprint.described(Blueprint.optional(JournalEntry.fields.id), "The accrual journal entry that booked it, once its payroll entry submitted it."),
  },
});

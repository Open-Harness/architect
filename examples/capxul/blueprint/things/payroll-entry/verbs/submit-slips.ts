import { Blueprint } from "orthograph";
import { PayrollEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { AccrualOutsideFiscalYear } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { SalarySlip } from "../../salary-slip/thing.ts";
import { JournalEntry } from "../../journal-entry/thing.ts";
import { JournalEntryAccount } from "../../journal-entry-account/thing.ts";
import { GLEntry } from "../../gl-entry/thing.ts";
import { EmployeeCount } from "../../../values/payroll.ts";

// HRMS's `submit_salary_slips` and `make_accrual_jv_entry`: every draft slip of the entry is submitted, and one journal
// entry books them all, made and submitted at once (7a's `journal-entry`: a submitted Journal Entry with its lines, and
// one GL Entry per line, voucher type Journal Entry). Its company and posting day are the entry's, and its remark
// "Accrual Journal Entry for salaries from <first day> to <last day>". Its lines: a debit per earning account, the sum
// of every slip's earning lines on components booked there; a credit per deduction account, the same for deductions;
// and a credit to the payable account of the slips' net pay. Every line is in the entry's cost center, and a line of 0
// is left out (HRMS's `if amt`). Each slip then names the journal entry. AccrualOutsideFiscalYear is judged before
// anything is written.
export default Blueprint.operation(PayrollEntry, {
  description: "Submit a payroll entry's salary slips, booking their pay in one accrual journal entry.",
  payload: { payrollEntry: PayrollEntry.fields.id },
  answer: { payrollEntry: PayrollEntry.fields.id, journalEntry: JournalEntry.fields.id, slips: EmployeeCount },
  move: machine.moves.submitSlips,
  errors: [AccrualOutsideFiscalYear],
  allowed: [owner.of("payrollEntry.company")],
  steps: {
    load: Blueprint.step.database({ writes: [] }),
    accrue: Blueprint.step.database({ writes: [PayrollEntry, SalarySlip, JournalEntry, JournalEntryAccount, GLEntry] }),
  },
  idempotent: "request",
  budget: { p95: "500 millis" },
});

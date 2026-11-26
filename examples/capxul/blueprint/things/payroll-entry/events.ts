import { Blueprint } from "orthograph";
import { PayrollEntry } from "./thing.ts";
import { JournalEntry } from "../journal-entry/thing.ts";
import { EmployeeCount } from "../../values/payroll.ts";

export const PayrollEntryDrafted = Blueprint.event({
  payrollEntry: PayrollEntry.fields.id,
  company: PayrollEntry.fields.company,
  numberOfEmployees: PayrollEntry.fields.numberOfEmployees,
});
/** `slips` is how many salary slips the submit made: one per employee. */
export const PayrollEntrySubmitted = Blueprint.event({ payrollEntry: PayrollEntry.fields.id, slips: EmployeeCount });
/** `slips` is how many salary slips were submitted; `journalEntry` is the accrual entry that books them. */
export const SalarySlipsSubmitted = Blueprint.event({ payrollEntry: PayrollEntry.fields.id, journalEntry: JournalEntry.fields.id, slips: EmployeeCount });

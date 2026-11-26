import { Blueprint } from "orthograph";
import { PayrollPeriod } from "./thing.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `payroll-period.create` refuses PayrollPeriodEndsBeforeStart, then PayrollPeriodOverlaps (HRMS's
// `validate`: `validate_from_to_dates`, then `validate_overlap`). PayrollPeriodNameTaken belongs to the rule in
// ./invariants.ts, and the runtime refuses it after these.
/** Frappe's `validate_from_to_dates`: the last day is before the first. A period of one day is allowed. It carries the first day. */
export class PayrollPeriodEndsBeforeStart extends Blueprint.error({ startDate: Day }, { exit: 41 }) {}
/**
 * HRMS's `validate_overlap`: the period shares a day with another of the company's periods, both ends counted. It
 * carries the other period; when it shares days with several, the earliest-starting one (HRMS names whichever its query
 * finds first).
 */
export class PayrollPeriodOverlaps extends Blueprint.error({ payrollPeriod: PayrollPeriod.fields.id }, { exit: 42 }) {}
/** HRMS names a period by prompt, unique across the site; here across one company (K42, call 10). */
export class PayrollPeriodNameTaken extends Blueprint.error({}, { exit: 43 }) {}

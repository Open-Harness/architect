import { Blueprint } from "orthograph";
import { FiscalYear } from "./thing.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `fiscal-year.create` refuses FiscalYearEndsBeforeStart, then FiscalYearWrongLength, then
// FiscalYearOverlaps (ERPNext's `validate`: `validate_dates`, then `validate_overlap`). FiscalYearNameTaken belongs to
// the rule in ./invariants.ts, and the runtime refuses it after these.
/** Frappe's `validate_from_to_dates`: the last day is before the first. A short year of one day is allowed. */
export class FiscalYearEndsBeforeStart extends Blueprint.error({ yearStartDate: Day }, { exit: 41 }) {}
/**
 * ERPNext's `validate_dates`: "Fiscal Year End Date should be one year after Fiscal Year Start Date". A year not
 * marked short ends on `yearEndDate`, the day before the same date a year on (from 29 February, a year on is 28
 * February, as `relativedelta` has it). A short year ends no later: Capxul's own bound, since ERPNext judges nothing for
 * a short year (`decisions/CX-ledger.md`). It carries the day the year should end on.
 */
export class FiscalYearWrongLength extends Blueprint.error({ yearEndDate: Day }, { exit: 42 }) {}
/**
 * ERPNext's `validate_overlap`: the year shares a day with another of the company's years, both ends counted. It
 * carries the other year; when it shares days with several, the earliest-starting one.
 */
export class FiscalYearOverlaps extends Blueprint.error({ fiscalYear: FiscalYear.fields.id }, { exit: 43 }) {}
/** ERPNext names a fiscal year by its `year`, so a company has one of each name. */
export class FiscalYearNameTaken extends Blueprint.error({}, { exit: 44 }) {}

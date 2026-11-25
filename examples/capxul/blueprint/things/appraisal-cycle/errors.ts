import { Blueprint } from "orthograph";
import { CycleName, RecordCount } from "../../values/appraisals.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `appraisal-cycle.create` refuses CycleEndsBeforeStart, then AppraiseeNotInCompany, then
// AppraiseeHasLeft, then AppraiseeTemplateNotInCompany, then AppraiseeListedTwice, each judged over every row before the
// next; CycleNameTaken is the rule's, refused at commit.
/** HRMS's `validate_from_to_dates("start_date", "end_date")`: the end isn't before the start. One day is allowed. It carries the start. */
export class CycleEndsBeforeStart extends Blueprint.error({ startDate: Day }, { exit: 41 }) {}
/** Capxul's own rule: each appraisee works for the cycle's company. HRMS fills the rows from the company's employees. An employee that doesn't exist is refused the same way. */
export class AppraiseeNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** CX-expense-leavers: no appraisee has left. HRMS fills the rows from Active employees (`get_employees_for_appraisal`). */
export class AppraiseeHasLeft extends Blueprint.error({}, { exit: 43 }) {}
/** Capxul's own rule: each row's template is the company's. A template that doesn't exist is refused the same way. */
export class AppraiseeTemplateNotInCompany extends Blueprint.error({}, { exit: 44 }) {}
/** Capxul's own rule: an employee is listed once. HRMS would make their appraisal once and skip the repeat. */
export class AppraiseeListedTwice extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's Create Appraisals: "Please select employees to create appraisals for". Capxul's start refuses it, where HRMS's Start alone doesn't. */
export class CycleWithoutAppraisees extends Blueprint.error({}, { exit: 46 }) {}
/** HRMS's `complete_cycle`: a cycle completes only once every appraisal in it is submitted. It carries how many are drafts. */
export class AppraisalsNotSubmitted extends Blueprint.error({ drafts: RecordCount }, { exit: 47 }) {}
/** HRMS names a cycle by its name (`autoname: field:cycle_name`), so a company has one cycle of each name. */
export class CycleNameTaken extends Blueprint.error({ cycleName: CycleName }, { exit: 48 }) {}

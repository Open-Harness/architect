import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `salary-structure-assignment.create` refuses AssignedEmployeeNotInCompany, then
// AssignedEmployeeHasLeft, then AssignmentExists, then AssignmentBeforeJoining (HRMS's `validate_dates`), then
// AssignedStructureNotInCompany (HRMS's `validate_company`), then AssignedStructureNotSubmitted. Submit judges
// AssignmentExists, then AssignedStructureNotSubmitted, again; the employee isn't judged again (CX-expense-leavers).
/** The employee works for another company. Capxul's own refusal: HRMS copies `company` from the employee (`fetch_from`). */
export class AssignedEmployeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * Capxul's own rule, as for expense claims (`decisions/CX-expense-leavers.md`): a new assignment is only for an
 * employee still at work. HRMS refuses a from-day after the relieving day, which Capxul doesn't store (#742, item 5).
 */
export class AssignedEmployeeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/**
 * HRMS's `validate_dates`: "Salary Structure Assignment for Employee already exists": a submitted assignment of the
 * employee starts on the same day. Drafts don't count. It carries the day.
 */
export class AssignmentExists extends Blueprint.error({ fromDate: Day }, { exit: 43 }) {}
/** HRMS's `validate_dates`: the from-day is before the employee's joining day. The joining day itself is allowed. */
export class AssignmentBeforeJoining extends Blueprint.error({ dateOfJoining: Day }, { exit: 44 }) {}
/** HRMS's `validate_company`: "Salary Structure does not belong to company". */
export class AssignedStructureNotInCompany extends Blueprint.error({}, { exit: 45 }) {}
/**
 * The structure is a draft or cancelled. HRMS's form offers only submitted structures, and its payroll counts only
 * those (`get_salary_structure`); Capxul refuses the assignment, on create and again on submit.
 */
export class AssignedStructureNotSubmitted extends Blueprint.error({}, { exit: 46 }) {}

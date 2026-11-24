import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `attendance-request.create` refuses RequesterNotInCompany, then RequesterHasLeft, then
// RequestEndsBeforeStart, then RequestBeforeJoining, in the order of HRMS's `validate` and `validate_dates`.
/** The employee named works for another company. */
export class RequesterNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * Capxul's own rule, as for attendance and expense claims (`decisions/CX-expense-leavers.md`): a new request is only for
 * an employee still at work, judged on create. HRMS refuses only an Inactive employee, and bounds the days by the
 * relieving day, which isn't stored (#742, item 5). A request opened before the employee left can still be approved.
 */
export class RequesterHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS's `validate_dates`: "To date can not be less than from date". The same day is allowed. */
export class RequestEndsBeforeStart extends Blueprint.error({ fromDate: Day }, { exit: 43 }) {}
/** HRMS's `validate_dates`: "From date can not be less than employee's joining date". The joining day itself is allowed. */
export class RequestBeforeJoining extends Blueprint.error({ dateOfJoining: Day }, { exit: 44 }) {}

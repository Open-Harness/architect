import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";
import { MaxContinuousDays } from "../../values/leave.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `leave-application.create` refuses in the order they are declared here: Capxul's own checks
// first, then HRMS's `validate` order (`validate_dates`, `validate_balance_leaves`, `validate_leave_overlap`,
// `validate_max_days`, `validate_attendance`). `approve` judges InsufficientLeaveBalance, then LeaveDayAttended.
/** Capxul's own: the employee named works for another company. HRMS copies `company` from the employee (`fetch_from`). */
export class ApplicantNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * Capxul's own (`decisions/CX-expense-leavers.md`): a new application is only for an employee still at work, judged on
 * create. HRMS's `validate_active_employee` refuses only Inactive. An application made before the employee left can
 * still be approved.
 */
export class ApplicantHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own: the leave type named is another company's (`decisions/CX-leave.md`, call 8). */
export class ApplicationTypeNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** HRMS's `validate_dates`: "To date cannot be before from date". The same day is allowed. */
export class LeaveEndsBeforeStart extends Blueprint.error({ fromDate: Day }, { exit: 44 }) {}
/** Capxul's own, as for attendance (`decisions/CX-leave.md`, call 7): no leave before the joining day, which is allowed. */
export class LeaveBeforeJoining extends Blueprint.error({ dateOfJoining: Day }, { exit: 45 }) {}
/**
 * HRMS's `validate_dates_across_allocation`: one submitted allocation of the employee and type must hold both the
 * first and the last day ("outside leave allocation period", "across two allocation records"). Leave without pay
 * skips it.
 */
export class NoAllocationCovers extends Blueprint.error({}, { exit: 46 }) {}
/** HRMS's `validate_balance_leaves`: every day asked for is a holiday, so the leave takes no day. */
export class LeaveAllHolidays extends Blueprint.error({}, { exit: 47 }) {}
/**
 * HRMS's `validate_balance_leaves`: the leave takes more days than the allocation covering it has left, which is its
 * leaves allocated less the days of every approved application of the employee and type inside it. Open ones don't
 * count. Leave without pay skips it. Judged again on approve.
 */
export class InsufficientLeaveBalance extends Blueprint.error({}, { exit: 48 }) {}
/** HRMS's `validate_leave_overlap`: an open or approved application of the employee, of any type, shares a day with this one. */
export class LeaveOverlaps extends Blueprint.error({}, { exit: 49 }) {}
/**
 * HRMS's `validate_max_days`: with the open or approved applications of the same type that run on from it, day after
 * day, the leave takes more days than its type allows in a row. A type allowing 0 has no limit.
 */
export class LeaveTooLong extends Blueprint.error({ maxContinuousDaysAllowed: MaxContinuousDays }, { exit: 50 }) {}
/** HRMS's `validate_attendance`: the employee is marked Present or Work From Home on a day asked for; it carries the first. Judged again on approve. */
export class LeaveDayAttended extends Blueprint.error({ attendanceDate: Day }, { exit: 51 }) {}

import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `attendance.mark` refuses AttendeeNotInCompany, then AttendeeHasLeft, then
// AttendanceBeforeJoining; AttendanceAlreadyMarked is the rule's, refused at commit.
/** The employee named works for another company. Capxul's own refusal: HRMS copies `company` from the employee (`fetch_from`). */
export class AttendeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * Capxul's own rule, as for expense claims (`decisions/CX-expense-leavers.md`): a new attendance is only for an employee
 * still at work. HRMS's `validate_active_employee` and `validate_employee_status` refuse only an Inactive employee,
 * which Capxul's employees can't be, so HRMS lets a Left employee be marked; this rule is stricter. HRMS's Attendance has
 * no relieving-day bound. A request opened before the employee left can still be approved and mark its days. Payroll
 * (slice 9) revisits it with full and final settlement.
 */
export class AttendeeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS's `validate_attendance_date`: no attendance before the employee's joining day. The joining day itself is allowed. */
export class AttendanceBeforeJoining extends Blueprint.error({ dateOfJoining: Day }, { exit: 43 }) {}
/** HRMS's `validate_duplicate_record`: an employee is marked once a day. */
export class AttendanceAlreadyMarked extends Blueprint.error({ attendanceDate: Day }, { exit: 44 }) {}

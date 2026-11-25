import { Blueprint } from "orthograph";

/** What a leave type is called (HRMS's `leave_type_name`): Annual Leave, Sick Leave, Leave Without Pay. */
export const LeaveTypeName = Blueprint.value(Blueprint.text({ max: 140 }));
/** The most days in a row one leave may run (HRMS's `max_continuous_days_allowed`, an Int): 0 means no limit. */
export const MaxContinuousDays = Blueprint.value(Blueprint.uint(32));
/** A yes or no on a leave type (HRMS's Check fields `is_lwp` and `include_holiday`). */
export const YesNo = Blueprint.value(Blueprint.bool());
/**
 * A number of leave days (HRMS's Float fields `new_leaves_allocated` and `total_leave_days`), exact, since half days
 * exist. Two places admit HRMS's earned-leave rounding of 0.25 (`decisions/CX-leave.md`, call 9).
 */
export const LeaveDays = Blueprint.value(Blueprint.decimal({ places: 2 }));
/** Why an employee asks for leave (HRMS's `description`). */
export const LeaveReason = Blueprint.value(Blueprint.text({ max: 500 }));

import { Blueprint } from "orthograph";
import { Schema } from "effect";

/**
 * How an employee was at work on a day (HRMS's Attendance `status`). HRMS's fifth, On Leave, comes with leave (8b),
 * since only an approved leave application marks it.
 */
export const AttendanceStatus = Blueprint.value(Schema.Literals(["Present", "Absent", "Half Day", "Work From Home"]));
/** Why an employee asks to be marked at work (HRMS's Attendance Request `reason`): Work From Home, or On Duty away from the office. */
export const AttendanceReason = Blueprint.value(Schema.Literals(["Work From Home", "On Duty"]));
/** How many days an approved request marked or changed. */
export const DayCount = Blueprint.value(Blueprint.uint(32));

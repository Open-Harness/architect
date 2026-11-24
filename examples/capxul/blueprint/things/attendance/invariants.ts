import { Blueprint } from "orthograph";
import { Attendance } from "./thing.ts";
import { AttendanceAlreadyMarked } from "./errors.ts";

// HRMS's `validate_duplicate_record`: one attendance per employee per day. HRMS lets two shifts' attendances share a
// day; that comes with shifts on attendance and Shift Assignment's overlap check (8b). An approved request finds a
// day's attendance through this rule (`findBy`), to change it rather than mark it twice.
export const oneAttendancePerDay = Blueprint.invariant.unique([Attendance.fields.employee, Attendance.fields.attendanceDate], {
  refuse: AttendanceAlreadyMarked,
});

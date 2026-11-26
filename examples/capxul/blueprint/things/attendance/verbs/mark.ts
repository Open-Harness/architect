import { Blueprint } from "orthograph";
import { Attendance } from "../thing.ts";
import { machine } from "../machine.ts";
import { AttendanceBeforeJoining, AttendanceOnLeave, AttendeeHasLeft, AttendeeNotInCompany } from "../errors.ts";
import { MarkedStatus } from "../../../values/attendance.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, AttendanceOnLeave, which
// finds the employee's approved leave applications with `Records.list`. On Leave isn't a status it takes. AttendanceAlreadyMarked
// belongs to the rule in ../invariants.ts, and the runtime refuses it. HRMS has no check on a day still to come at
// `46b38904`: its `validate_attendance_date` checks only the joining day.
export default Blueprint.operation(Attendance, {
  description: "Mark whether an employee was at work on a day.",
  payload: {
    company: Attendance.fields.company,
    employee: Attendance.fields.employee,
    attendanceDate: Attendance.fields.attendanceDate,
    status: MarkedStatus,
  },
  answer: { attendance: Attendance.fields.id },
  move: machine.moves.mark,
  errors: [AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, AttendanceOnLeave],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

import { Blueprint } from "orthograph";
import { Attendance } from "../thing.ts";
import { machine } from "../machine.ts";
import { AttendanceBeforeJoining, AttendeeHasLeft, AttendeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining. AttendanceAlreadyMarked
// belongs to the rule in ../invariants.ts, and the runtime refuses it. HRMS has no check on a day still to come at
// `46b38904`: its `validate_attendance_date` checks only the joining day.
export default Blueprint.operation(Attendance, {
  description: "Mark whether an employee was at work on a day.",
  payload: {
    company: Attendance.fields.company,
    employee: Attendance.fields.employee,
    attendanceDate: Attendance.fields.attendanceDate,
    status: Attendance.fields.status,
  },
  answer: { attendance: Attendance.fields.id },
  move: machine.moves.mark,
  errors: [AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

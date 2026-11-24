import { Blueprint } from "orthograph";
import { AttendanceRequest } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { Attendance } from "../../attendance/thing.ts";
import { DayCount } from "../../../values/attendance.ts";

// HRMS's `create_attendance_records`: every day from the request's first to its last is marked, Work From Home for
// that reason and Present for On Duty, in the request's company. A day already marked with another status is changed
// to it, and one already marked with it is left (`create_or_update_attendance`). `marked` counts the new attendances,
// `changed` the ones whose status changed. HRMS's refusal when no day would change (`validate_no_attendance_to_create`)
// is left for later; holidays and leave, which HRMS skips, come with a holiday list per employee and leave (8b).
export default Blueprint.operation(AttendanceRequest, {
  description: "Approve a request, marking each of its days.",
  payload: { attendanceRequest: AttendanceRequest.fields.id },
  answer: { attendanceRequest: AttendanceRequest.fields.id, marked: DayCount, changed: DayCount },
  move: machine.moves.approve,
  allowed: [owner.of("attendanceRequest.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), mark: Blueprint.step.database({ writes: [AttendanceRequest, Attendance] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});

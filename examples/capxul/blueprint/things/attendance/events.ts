import { Blueprint } from "orthograph";
import { Attendance } from "./thing.ts";

export const AttendanceMarked = Blueprint.event({
  attendance: Attendance.fields.id,
  employee: Attendance.fields.employee,
  attendanceDate: Attendance.fields.attendanceDate,
  status: Attendance.fields.status,
});

import { Blueprint } from "orthograph";
import { AttendanceRequest } from "./thing.ts";
import { DayCount } from "../../values/attendance.ts";

export const AttendanceRequested = Blueprint.event({
  attendanceRequest: AttendanceRequest.fields.id,
  company: AttendanceRequest.fields.company,
  employee: AttendanceRequest.fields.employee,
});
export const AttendanceRequestApproved = Blueprint.event({ attendanceRequest: AttendanceRequest.fields.id, marked: DayCount, changed: DayCount });
export const AttendanceRequestRejected = Blueprint.event({ attendanceRequest: AttendanceRequest.fields.id });

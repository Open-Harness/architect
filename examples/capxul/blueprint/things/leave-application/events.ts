import { Blueprint } from "orthograph";
import { LeaveApplication } from "./thing.ts";
import { DayCount } from "../../values/attendance.ts";

export const LeaveApplied = Blueprint.event({
  leaveApplication: LeaveApplication.fields.id,
  company: LeaveApplication.fields.company,
  employee: LeaveApplication.fields.employee,
  leaveType: LeaveApplication.fields.leaveType,
});
export const LeaveApplicationApproved = Blueprint.event({ leaveApplication: LeaveApplication.fields.id, marked: DayCount, changed: DayCount });
export const LeaveApplicationRejected = Blueprint.event({ leaveApplication: LeaveApplication.fields.id });
export const LeaveApplicationCancelled = Blueprint.event({ leaveApplication: LeaveApplication.fields.id });

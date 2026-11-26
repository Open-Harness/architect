import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { LeaveType } from "../leave-type/thing.ts";
import { Day } from "../../values/employee.ts";
import { LeaveDays, LeaveReason } from "../../values/leave.ts";

// HRMS's Leave Application (hrms/hr/doctype/leave_application): its required fields, its reason (`description`) and
// `total_leave_days`, the days it takes once holidays are skipped (`decisions/CX-leave.md`). Half days, the leave
// approver, posting date and salary slip come later. Its `status` is the machine's state.
export const LeaveApplication = Blueprint.thing({
  description: "An employee's ask for leave of one type, from one day to another.",
  code: "LP",
  fields: {
    id: Blueprint.id("lap"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    leaveType: LeaveType.fields.id,
    fromDate: Day,
    toDate: Day,
    reason: LeaveReason,
    totalLeaveDays: LeaveDays,
  },
});

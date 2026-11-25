import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Day } from "../../values/employee.ts";
import { AttendanceReason } from "../../values/attendance.ts";

// HRMS's Attendance Request (hrms/hr/doctype/attendance_request): its required fields. Its half day, explanation and
// shift wait on optional fields and references (#742, item 5). `include_holidays` waits on an employee's holiday list,
// and the overlap check between requests (`validate_request_overlap`) on a list (#764).
export const AttendanceRequest = Blueprint.thing({
  description: "An employee's ask to be marked at work on days the office didn't see them.",
  code: "AQ",
  fields: {
    id: Blueprint.id("arq"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    fromDate: Day,
    toDate: Day,
    reason: AttendanceReason,
  },
});

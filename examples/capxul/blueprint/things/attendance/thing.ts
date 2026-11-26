import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Day } from "../../values/employee.ts";
import { AttendanceStatus } from "../../values/attendance.ts";

// HRMS's Attendance (hrms/hr/doctype/attendance): its required fields. Its shift waits on optional references (#742,
// item 5), and its check-in times, late entry and early exit come with check-ins. Its leave type and application wait
// on optional references (#967); an approved leave marks its days On Leave, and `mark` refuses a day one covers.
export const Attendance = Blueprint.thing({
  description: "Whether an employee was at work on one day.",
  code: "AN",
  fields: {
    id: Blueprint.id("att"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    attendanceDate: Day,
    status: AttendanceStatus,
  },
});

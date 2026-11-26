import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { LeaveType } from "../leave-type/thing.ts";
import { Day } from "../../values/employee.ts";
import { LeaveDays } from "../../values/leave.ts";

// HRMS's Leave Allocation (hrms/hr/doctype/leave_allocation): its required fields (`decisions/CX-leave.md`). Its
// carry-forward, unused and encashed leaves, leave period, policy and compensatory request are out of scope, so
// `total_leaves_allocated` is `new_leaves_allocated` and is kept once.
export const LeaveAllocation = Blueprint.thing({
  description: "The leave days an employee has of one type, between two days.",
  code: "LL",
  fields: {
    id: Blueprint.id("lal"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    leaveType: LeaveType.fields.id,
    fromDate: Day,
    toDate: Day,
    newLeavesAllocated: LeaveDays,
  },
});

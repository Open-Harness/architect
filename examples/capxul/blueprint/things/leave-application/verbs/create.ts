import { Blueprint } from "orthograph";
import { LeaveApplication } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  ApplicantHasLeft,
  ApplicantNotInCompany,
  ApplicationTypeNotInCompany,
  InsufficientLeaveBalance,
  LeaveAllHolidays,
  LeaveBeforeJoining,
  LeaveDayAttended,
  LeaveEndsBeforeStart,
  LeaveOverlaps,
  LeaveTooLong,
  NoAllocationCovers,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { LeaveDays } from "../../../values/leave.ts";

// Refusal order (errors.ts). `totalLeaveDays` is the days from the first to the last, both counted, less the holidays
// among them unless the type counts holidays. A holiday is a day any of the company's holiday lists holds
// (`decisions/CX-leave.md`, call 1). Every other application, allocation, holiday and attendance it judges is found with
// `Records.list`.
export default Blueprint.operation(LeaveApplication, {
  description: "Ask for leave of one type, from one day to another, and why.",
  payload: {
    company: LeaveApplication.fields.company,
    employee: LeaveApplication.fields.employee,
    leaveType: LeaveApplication.fields.leaveType,
    fromDate: LeaveApplication.fields.fromDate,
    toDate: LeaveApplication.fields.toDate,
    reason: LeaveApplication.fields.reason,
  },
  answer: { leaveApplication: LeaveApplication.fields.id, totalLeaveDays: LeaveDays },
  move: machine.moves.create,
  errors: [
    ApplicantNotInCompany,
    ApplicantHasLeft,
    ApplicationTypeNotInCompany,
    LeaveEndsBeforeStart,
    LeaveBeforeJoining,
    NoAllocationCovers,
    LeaveAllHolidays,
    InsufficientLeaveBalance,
    LeaveOverlaps,
    LeaveTooLong,
    LeaveDayAttended,
  ],
  allowed: [self.of("employee"), owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "300 millis" },
});

import { Blueprint } from "orthograph";
import { LeaveApplication } from "../thing.ts";
import { machine } from "../machine.ts";
import { InsufficientLeaveBalance, LeaveDayAttended } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Attendance } from "../../attendance/thing.ts";
import { DayCount } from "../../../values/attendance.ts";

// HRMS saves the application as Approved and runs `validate` again, so the balance (counting the approved days now)
// and the attended days are judged again (`decisions/CX-leave.md`, call 2). Then `update_attendance`: every leave day,
// holidays skipped unless the type counts them, is marked On Leave in the application's company. A day already marked
// with another status is changed to On Leave and one already On Leave is left. `marked` counts the new attendances,
// `changed` the ones changed. A holiday already marked is left as it is; HRMS deletes it (call 10). The employee isn't
// judged again (CX-expense-leavers).
export default Blueprint.operation(LeaveApplication, {
  description: "Approve a leave, marking each of its days On Leave.",
  payload: { leaveApplication: LeaveApplication.fields.id },
  answer: { leaveApplication: LeaveApplication.fields.id, marked: DayCount, changed: DayCount },
  move: machine.moves.approve,
  errors: [InsufficientLeaveBalance, LeaveDayAttended],
  allowed: [owner.of("leaveApplication.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), mark: Blueprint.step.database({ writes: [LeaveApplication, Attendance] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

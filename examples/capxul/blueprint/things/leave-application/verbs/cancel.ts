import { Blueprint } from "orthograph";
import { LeaveApplication } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// A cancelled application takes no balance and blocks no other. The days an approved one marked On Leave stay as they
// are: HRMS's `cancel_attendance` cancels them, which waits on cancelling an attendance (`decisions/CX-leave.md`).
export default Blueprint.operation(LeaveApplication, {
  description: "Cancel a leave, open or approved.",
  payload: { leaveApplication: LeaveApplication.fields.id },
  answer: { leaveApplication: LeaveApplication.fields.id },
  move: machine.moves.cancel,
  allowed: [owner.of("leaveApplication.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

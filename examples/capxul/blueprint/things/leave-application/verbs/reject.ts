import { Blueprint } from "orthograph";
import { LeaveApplication } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// A rejected application marks no day and takes no balance.
export default Blueprint.operation(LeaveApplication, {
  description: "Reject a leave, marking none of its days.",
  payload: { leaveApplication: LeaveApplication.fields.id },
  answer: { leaveApplication: LeaveApplication.fields.id },
  move: machine.moves.reject,
  allowed: [owner.of("leaveApplication.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

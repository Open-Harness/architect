import { Blueprint } from "orthograph";
import { LeaveAllocation } from "../thing.ts";
import { machine } from "../machine.ts";
import { AllocationOverlaps } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HRMS runs `validate` again on submit, so the overlap is judged again: another allocation submitted since this one
// was made refuses it. The employee isn't judged again (CX-expense-leavers).
export default Blueprint.operation(LeaveAllocation, {
  description: "Submit an allocation, so its leave days can be taken.",
  payload: { leaveAllocation: LeaveAllocation.fields.id },
  answer: { leaveAllocation: LeaveAllocation.fields.id },
  move: machine.moves.submit,
  errors: [AllocationOverlaps],
  allowed: [owner.of("leaveAllocation.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

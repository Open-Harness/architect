import { Blueprint } from "orthograph";
import { LeaveType } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// LeaveTypeNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it. HRMS's `validate_lwp` (a
// type with live allocations can't become leave without pay) needs a change to an existing type, which comes later.
export default Blueprint.operation(LeaveType, {
  description: "Add a kind of leave a company gives.",
  payload: {
    company: LeaveType.fields.company,
    leaveTypeName: LeaveType.fields.leaveTypeName,
    maxContinuousDaysAllowed: LeaveType.fields.maxContinuousDaysAllowed,
    isLwp: LeaveType.fields.isLwp,
    includeHoliday: LeaveType.fields.includeHoliday,
  },
  answer: { leaveType: LeaveType.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

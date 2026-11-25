import { Blueprint } from "orthograph";
import { AppraisalCycle } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// HRMS's form: "Mark as In Progress" on a completed cycle, which opens its records to changes again.
export default Blueprint.operation(AppraisalCycle, {
  description: "Put a completed cycle back in progress.",
  payload: { appraisalCycle: AppraisalCycle.fields.id },
  answer: { appraisalCycle: AppraisalCycle.fields.id },
  move: machine.moves.reopen,
  allowed: [owner.of("appraisalCycle.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

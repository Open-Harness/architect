import { Blueprint } from "orthograph";
import { AppraisalCycle } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraisalsNotSubmitted } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HRMS's `complete_cycle`: refused while any appraisal in the cycle is a draft. Completing it stops changes to its
// appraisals, goals and feedback (`validate_active_appraisal_cycle`).
export default Blueprint.operation(AppraisalCycle, {
  description: "Mark a cycle completed once every appraisal in it is submitted.",
  payload: { appraisalCycle: AppraisalCycle.fields.id },
  answer: { appraisalCycle: AppraisalCycle.fields.id },
  move: machine.moves.complete,
  errors: [AppraisalsNotSubmitted],
  allowed: [owner.of("appraisalCycle.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "300 millis" },
});

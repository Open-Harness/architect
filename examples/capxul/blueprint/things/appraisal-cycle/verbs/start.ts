import { Blueprint } from "orthograph";
import { AppraisalCycle } from "../thing.ts";
import { machine } from "../machine.ts";
import { CycleWithoutAppraisees } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";
import { AppraisalIds } from "../../../values/appraisal-ids.ts";

// HRMS's Start, with its `create_appraisals_for_cycle`: one appraisal per appraisee, in the order listed, each with the
// row's template, the cycle's method, its KRA lines and criteria copied, and every score 0, as `appraisal.create` makes
// one. An appraisee who already has an appraisal in the cycle is skipped, as HRMS passes over its
// DuplicateEntryError, and so is one who has left since the cycle was set up (CX-expense-leavers). `appraisals` lists the
// ones made.
export default Blueprint.operation(AppraisalCycle, {
  description: "Start a cycle, making an appraisal for each appraisee who has none yet.",
  payload: { appraisalCycle: AppraisalCycle.fields.id },
  answer: { appraisalCycle: AppraisalCycle.fields.id, appraisals: AppraisalIds },
  move: machine.moves.start,
  errors: [CycleWithoutAppraisees],
  allowed: [owner.of("appraisalCycle.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), create: Blueprint.step.database({ writes: [AppraisalCycle, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "500 millis" },
});

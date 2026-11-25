import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraisalCycleCompleted } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HRMS's submit runs `validate` once more, whose only refusal that can still apply is a completed cycle: an appraisal
// may be submitted while its cycle hasn't started, or is in progress. A leaver's open appraisal may be submitted.
export default Blueprint.operation(Appraisal, {
  description: "Submit an appraisal, fixing its scores.",
  payload: { appraisal: Appraisal.fields.id },
  answer: { appraisal: Appraisal.fields.id, finalScore: Appraisal.fields.finalScore },
  move: machine.moves.submit,
  errors: [AppraisalCycleCompleted],
  allowed: [owner.of("appraisal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

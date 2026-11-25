import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// HRMS's submit runs `validate` once more. Its completed-cycle refusal can't apply to a draft: a cycle completes only
// once no appraisal in it is a draft, and none is made in a completed one. So an appraisal may be submitted whenever it
// is a draft, whether its cycle has started or not. A leaver's open appraisal may be submitted. As in
// HRMS, a submitted appraisal's KRA scores still follow its goals, and its feedback score its submitted feedback, until
// the cycle completes (`set_goal_score(update=True)`, `calculate_avg_feedback_score(update=True)` write it directly).
export default Blueprint.operation(Appraisal, {
  description: "Submit an appraisal.",
  payload: { appraisal: Appraisal.fields.id },
  answer: { appraisal: Appraisal.fields.id, finalScore: Appraisal.fields.finalScore },
  move: machine.moves.submit,
  allowed: [owner.of("appraisal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

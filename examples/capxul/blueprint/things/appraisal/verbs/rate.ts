import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraisalCycleCompleted, KraScoreOutOfRange, NotRatedManually, ScoresDontMatchKras } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { GivenScores } from "../../../values/appraisal-lines.ts";

// HRMS's Appraisal Goal under Manual Rating: each KRA's score, 0 to 5; `calculate_total_score` gives each line
// score × weightage ÷ 100 and the total, and `calculate_final_score` the final score. Refusal order (errors.ts).
export default Blueprint.operation(Appraisal, {
  description: "Score each KRA of an appraisal by hand, from 0 to 5.",
  payload: { appraisal: Appraisal.fields.id, scores: GivenScores },
  answer: { appraisal: Appraisal.fields.id, totalScore: Appraisal.fields.totalScore, finalScore: Appraisal.fields.finalScore },
  move: machine.moves.rate,
  errors: [AppraisalCycleCompleted, NotRatedManually, ScoresDontMatchKras, KraScoreOutOfRange],
  allowed: [owner.of("appraisal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

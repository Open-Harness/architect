import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraisalCycleCompleted, SelfRatingOutOfRange, SelfRatingsDontMatchCriteria } from "../errors.ts";
import { self } from "../../employee/roles.ts";
import { GivenRatings } from "../../../values/appraisal-lines.ts";

// HRMS's self appraisal: the employee rates each of the template's criteria, 0 to 1, and `calculate_self_appraisal_score`
// gives rating × 5 × weightage ÷ 100 summed. Only the employee, signed in as themselves, rates themselves. Refusal
// order (errors.ts). A leaver may still finish an open appraisal (CX-expense-leavers).
export default Blueprint.operation(Appraisal, {
  description: "Rate yourself against each of your appraisal's criteria, from 0 to 1.",
  payload: { appraisal: Appraisal.fields.id, ratings: GivenRatings },
  answer: { appraisal: Appraisal.fields.id, selfScore: Appraisal.fields.selfScore, finalScore: Appraisal.fields.finalScore },
  move: machine.moves.selfRate,
  errors: [AppraisalCycleCompleted, SelfRatingsDontMatchCriteria, SelfRatingOutOfRange],
  allowed: [self.of("appraisal.employee")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

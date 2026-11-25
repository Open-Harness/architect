import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted, GoalIsGroup, ProgressOutOfRange } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's `update_progress`: the goal's progress, then its status (`set_status`), its parent's progress and status, and
// under the automated method its appraisal's scores follow, as on create. Refusal order (errors.ts).
export default Blueprint.operation(Goal, {
  description: "Set how far along a goal is, from 0 to 100.",
  payload: { goal: Goal.fields.id, progress: Goal.fields.progress },
  answer: { goal: Goal.fields.id, progress: Goal.fields.progress },
  move: machine.moves.updateProgress,
  errors: [GoalCycleCompleted, GoalIsGroup, ProgressOutOfRange],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

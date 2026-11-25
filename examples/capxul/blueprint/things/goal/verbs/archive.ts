import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted, GoalIsGroup } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's Archive: an archived goal is left out of its parent's progress and its appraisal's KRA score, which follow.
export default Blueprint.operation(Goal, {
  description: "Archive a goal: it no longer counts towards its parent or its appraisal.",
  payload: { goal: Goal.fields.id },
  answer: { goal: Goal.fields.id },
  move: machine.moves.archive,
  errors: [GoalCycleCompleted, GoalIsGroup],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

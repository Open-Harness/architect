import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted, GoalIsGroup } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's `update_status("Completed")`: the progress becomes 100, and the parent's progress and appraisal follow as on an update.
export default Blueprint.operation(Goal, {
  description: "Mark a goal completed, setting its progress to 100.",
  payload: { goal: Goal.fields.id },
  answer: { goal: Goal.fields.id },
  move: machine.moves.complete,
  errors: [GoalCycleCompleted, GoalIsGroup],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

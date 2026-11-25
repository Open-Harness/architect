import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's Close: the status is kept whatever the progress, and the goal still counts.
export default Blueprint.operation(Goal, {
  description: "Close a goal, keeping its progress.",
  payload: { goal: Goal.fields.id },
  answer: { goal: Goal.fields.id },
  move: machine.moves.close,
  errors: [GoalCycleCompleted],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's Unarchive sets the status back from the progress, and the goal counts again.
export default Blueprint.operation(Goal, {
  description: "Bring an archived goal back: its status follows its progress again.",
  payload: { goal: Goal.fields.id },
  answer: { goal: Goal.fields.id },
  move: machine.moves.unarchive,
  errors: [GoalCycleCompleted],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

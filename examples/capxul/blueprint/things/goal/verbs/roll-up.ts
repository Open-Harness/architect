import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import { GoalCycleCompleted, GoalNotGroup } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// HRMS's `update_parent_progress` sets a group's progress and status as a child saves. Here a child's move rolls the
// group's progress up as a field update, and the group's status follows by this call: pending at 0, in progress below
// 100, completed at 100 (`set_status`). It is a second call until #972 lets one handler move another goal's state, when
// it folds into the child's moves (`decisions/CX-appraisals.md`). It answers the goal's cycle, so the next call can
// reach it. Refusal order (errors.ts).
export default Blueprint.operation(Goal, {
  description: "Bring a group goal's status up to date with the progress its children have rolled up.",
  payload: { goal: Goal.fields.id },
  answer: { goal: Goal.fields.id, progress: Goal.fields.progress, appraisalCycle: Goal.fields.appraisalCycle },
  move: machine.moves.rollUp,
  errors: [GoalCycleCompleted, GoalNotGroup],
  allowed: [self.of("goal.employee"), owner.of("goal.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

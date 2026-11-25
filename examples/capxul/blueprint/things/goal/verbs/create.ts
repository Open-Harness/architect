import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  GoalCycleCompleted,
  GoalEmployeeNotInCompany,
  GoalKraNotInAppraisal,
  GoalOwnerHasLeft,
  ParentGoalMismatch,
  ParentGoalNotGroup,
  ProgressOutOfRange,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's Goal insert: its company is the cycle's, and its status follows its progress; a group starts at 0, whatever is typed (`before_insert`). A child under a parent makes the parent's progress the average of
// its children that aren't archived, and its status follow (`update_parent_progress`). Under the automated method, the
// employee's appraisal in the cycle takes each KRA's score as the average progress of its top goals that aren't archived,
// and its scores follow (`update_goal_progress_in_appraisal`, `set_goal_score`). Refusal order (errors.ts).
export default Blueprint.operation(Goal, {
  description: "Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.",
  payload: {
    employee: Goal.fields.employee,
    appraisalCycle: Goal.fields.appraisalCycle,
    kra: Goal.fields.kra,
    goalName: Goal.fields.goalName,
    progress: Goal.fields.progress,
    isGroup: Goal.fields.isGroup,
    parentGoal: Goal.fields.parentGoal,
  },
  answer: { goal: Goal.fields.id },
  move: machine.moves.create,
  errors: [GoalCycleCompleted, GoalEmployeeNotInCompany, GoalOwnerHasLeft, GoalKraNotInAppraisal, ParentGoalMismatch, ProgressOutOfRange, ParentGoalNotGroup],
  allowed: [self.of("employee"), owner.of("appraisalCycle.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database({ writes: [Goal, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "400 millis" },
});

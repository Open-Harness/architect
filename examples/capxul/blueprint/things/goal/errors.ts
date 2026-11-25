import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `goal.create` refuses GoalCycleCompleted, then GoalEmployeeNotInCompany, then GoalOwnerHasLeft,
// then GoalKraNotInAppraisal, then ParentGoalMismatch, then ProgressOutOfRange, then ParentGoalNotGroup (HRMS's
// `validate`: the cycle, the employee, the parent, the progress; then the parent's `validate_ledger` as it saves).
// `update-progress` refuses GoalCycleCompleted, then GoalIsGroup, then ProgressOutOfRange; `complete`, `archive` and
// `close` refuse GoalCycleCompleted, then GoalIsGroup; `unarchive` and `reopen` refuse GoalCycleCompleted; `roll-up`
// refuses GoalCycleCompleted, then GoalNotGroup.
/** HRMS's `validate_active_appraisal_cycle`: no goal is made or changed in a completed cycle. */
export class GoalCycleCompleted extends Blueprint.error({}, { exit: 41 }) {}
/** Capxul's own rule: the employee works for the cycle's company, which the goal takes. HRMS copies the company from the employee. */
export class GoalEmployeeNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** CX-expense-leavers: no new goal for an employee who has left. Goals already set may still move. */
export class GoalOwnerHasLeft extends Blueprint.error({}, { exit: 43 }) {}
/**
 * The employee has an appraisal in the cycle and the KRA is one of its KRAs. HRMS's form offers only those
 * (`get_kras_for_employee`, which reads the appraisal); its server checks nothing, so here the server does.
 */
export class GoalKraNotInAppraisal extends Blueprint.error({}, { exit: 44 }) {}
/** HRMS's `validate_parent_fields`: a child goal has its parent's employee, KRA and cycle. */
export class ParentGoalMismatch extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's `validate_progress`: progress is at most 100. Below 0 is Capxul's own. */
export class ProgressOutOfRange extends Blueprint.error({}, { exit: 46 }) {}
/**
 * A group goal's progress follows its children, so it isn't set, completed, archived or closed by hand. HRMS's list
 * refuses a group's status ("Cannot update status of Goal groups"); setting a group's progress by hand is Capxul's own refusal, as the next
 * child would overwrite it.
 */
export class GoalIsGroup extends Blueprint.error({}, { exit: 47 }) {}
/** Only a group's status is rolled up: a goal that isn't a group takes its status from its own progress as it moves. */
export class GoalNotGroup extends Blueprint.error({}, { exit: 49 }) {}
/** Frappe's `validate_ledger`: a goal that isn't a group can't hold goals ("cannot be a leaf node as it has children"). */
export class ParentGoalNotGroup extends Blueprint.error({}, { exit: 48 }) {}

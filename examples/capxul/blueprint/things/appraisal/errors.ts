import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `appraisal.create` refuses AppraisedEmployeeNotInCompany, then AppraisedEmployeeHasLeft, then
// AppraisalCycleCompleted, then AppraisalTemplateNotInCompany (HRMS's `validate`: the employee, then the cycle);
// AppraisalAlreadyExists is the rule's, refused at commit. `rate` refuses AppraisalCycleCompleted, then NotRatedManually,
// then ScoresDontMatchKras, then KraScoreOutOfRange; `self-rate` refuses AppraisalCycleCompleted, then
// SelfRatingsDontMatchCriteria, then SelfRatingOutOfRange; `submit` refuses AppraisalCycleCompleted.
/** Capxul's own rule: the employee works for the cycle's company. HRMS copies the company from the cycle. */
export class AppraisedEmployeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** CX-expense-leavers: no new appraisal for an employee who has left. One already open may still be rated and submitted. */
export class AppraisedEmployeeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS's `validate_active_appraisal_cycle`, on every save: nothing is made or changed against a completed cycle. */
export class AppraisalCycleCompleted extends Blueprint.error({}, { exit: 43 }) {}
/** Capxul's own rule: the template is the cycle's company's. HRMS's templates are site-wide. */
export class AppraisalTemplateNotInCompany extends Blueprint.error({}, { exit: 44 }) {}
/** HRMS's `validate_duplicate`: one appraisal per employee per cycle. */
export class AppraisalAlreadyExists extends Blueprint.error({}, { exit: 51 }) {}
/** HRMS scores the KRAs by hand only under Manual Rating (`rate_goals_manually`); otherwise goals' progress scores them. */
export class NotRatedManually extends Blueprint.error({}, { exit: 46 }) {}
/** Capxul's own rule: a rating by hand scores each of the appraisal's KRAs exactly once. HRMS edits its table in place. */
export class ScoresDontMatchKras extends Blueprint.error({}, { exit: 47 }) {}
/** HRMS's `calculate_total_score`: "Goal Score cannot be greater than 5". Below 0 is Capxul's own. */
export class KraScoreOutOfRange extends Blueprint.error({}, { exit: 48 }) {}
/** Capxul's own rule: self ratings rate each of the appraisal's criteria exactly once. HRMS edits its table in place. */
export class SelfRatingsDontMatchCriteria extends Blueprint.error({}, { exit: 49 }) {}
/** HRMS's Rating field holds 0 to 1: a rating outside it is refused. */
export class SelfRatingOutOfRange extends Blueprint.error({}, { exit: 50 }) {}

import { Blueprint } from "orthograph";

// Appraisals' numbers (`decisions/CX-appraisals.md`). Every one is an exact decimal with two places, as leave's are:
// Capxul's choice, where HRMS stores most scores at the site's float precision (3 by default). A score worked out from
// others is rounded to two places half up, as Frappe's default rounding (`Banker's Rounding (legacy)`) rounds a half up,
// where HRMS rounds and where the stored field has two places.

/** A line's share of a template, in percent (HRMS's `per_weightage`). Capxul takes it more than 0 and at most 100. */
export const Weightage = Blueprint.value(Blueprint.decimal({ places: 2 }));
/** A rating on HRMS's Rating field: 0 to 1, five stars being 1. A score is a rating times five. */
export const Rating = Blueprint.value(Blueprint.decimal({ places: 2 }));
/**
 * A score: a KRA's manual score from 0 to 5 (HRMS's Appraisal Goal `score`), or its goal completion from 0 to 100
 * (Appraisal KRA `goal_completion`), what a line earns, or an appraisal's total, self, feedback or final score.
 */
export const Score = Blueprint.value(Blueprint.decimal({ places: 2 }));
/** A goal's progress, in percent, 0 to 100 (HRMS's Goal `progress`). */
export const Progress = Blueprint.value(Blueprint.decimal({ places: 2 }));
/** How a cycle's KRAs are scored (HRMS's `kra_evaluation_method`, in its own words). */
export const EvaluationMethod = Blueprint.value(Blueprint.oneOf(["Automated Based on Goal Progress", "Manual Rating"]));
/** How many records a call made or found. */
export const RecordCount = Blueprint.value(Blueprint.uint(16));

/** A KRA's title (HRMS's KRA `title`), unique in its company. */
export const KraTitle = Blueprint.value(Blueprint.text({ max: 140 }));
/** A feedback criteria's name (HRMS's Employee Feedback Criteria `criteria`), unique in its company. */
export const CriteriaName = Blueprint.value(Blueprint.text({ max: 140 }));
/** A template's title (HRMS's Appraisal Template `template_title`), unique in its company. */
export const TemplateTitle = Blueprint.value(Blueprint.text({ max: 140 }));
/** A cycle's name (HRMS's Appraisal Cycle `cycle_name`), unique in its company. */
export const CycleName = Blueprint.value(Blueprint.text({ max: 140 }));
/** A goal's name (HRMS's Goal `goal_name`). */
export const GoalName = Blueprint.value(Blueprint.text({ max: 140 }));
/** What a reviewer writes (HRMS's Employee Performance Feedback `feedback`, a Text Editor field, required). */
export const FeedbackText = Blueprint.value(Blueprint.text({ max: 2000 }));

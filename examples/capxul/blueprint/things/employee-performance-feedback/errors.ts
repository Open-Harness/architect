import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `create` refuses FeedbackCycleCompleted, then FeedbackForOneself, then ReviewerNotInCompany,
// then ReviewerHasLeft, then FeedbackRatingsDontMatchCriteria, then FeedbackRatingOutOfRange. `submit` refuses
// FeedbackCycleCompleted. HRMS lets a reviewer give any number of feedbacks on one appraisal.
/**
 * HRMS's `validate_active_appraisal_cycle`: no feedback is given or submitted against a completed cycle. HRMS refuses
 * nothing else about the cycle's state, so a cycle not yet started takes feedback too (`decisions/CX-appraisals.md`).
 */
export class FeedbackCycleCompleted extends Blueprint.error({}, { exit: 41 }) {}
/** HRMS's `validate_employee`: "Employees cannot give feedback to themselves. Use Self Appraisal instead." */
export class FeedbackForOneself extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own rule: the reviewer works for the appraisal's company. HRMS's reviewer is any employee on the site. */
export class ReviewerNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** CX-expense-leavers, with Interview Feedback as its precedent: a reviewer who has left starts no new feedback, but may submit one already drafted. */
export class ReviewerHasLeft extends Blueprint.error({}, { exit: 44 }) {}
/** Capxul's own rule: the ratings rate each of the appraisal's criteria exactly once (HRMS copies them, `set_feedback_criteria`). */
export class FeedbackRatingsDontMatchCriteria extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's Rating field holds 0 to 1: a rating outside it is refused. */
export class FeedbackRatingOutOfRange extends Blueprint.error({}, { exit: 46 }) {}

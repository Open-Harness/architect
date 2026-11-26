import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Kra } from "../things/kra/thing.ts";
import { EmployeeFeedbackCriteria } from "../things/employee-feedback-criteria/thing.ts";
import { Rating, Score, Weightage } from "./appraisals.ts";

// The lines of a template, an appraisal and a feedback (HRMS's child tables), each a list in its record. Each holds at most
// twenty lines (a Capxul bound). They name KRAs and criteria, so they live apart from `appraisals.ts`, which the KRA and
// the criteria import for their names.
const kraId = Kra.fields.id.value.schema;
const criteriaId = EmployeeFeedbackCriteria.fields.id.value.schema;

/** A template's KRA lines (HRMS's Appraisal Template Goal): each KRA once, with its weightage. At most twenty. */
export const TemplateKras = Blueprint.value(Schema.Array(Schema.Struct({ kra: kraId, weightage: Weightage.schema })).check(Schema.isMaxLength(20)));
/** A template's rating criteria (HRMS's Employee Feedback Rating, under a template): each once, with its weightage. None is allowed. */
export const TemplateCriteria = Blueprint.value(
  Schema.Array(Schema.Struct({ criteria: criteriaId, weightage: Weightage.schema })).check(Schema.isMaxLength(20)),
);
/**
 * An appraisal's KRA lines, copied from its template on create, in its order. Under Manual Rating, `score` is the
 * owner's, 0 to 5 (HRMS's Appraisal Goal); under Automated Based on Goal Progress it is the KRA's goal completion, 0 to
 * 100 (HRMS's Appraisal KRA). `earned` is score × weightage ÷ 100 (`score_earned`, `goal_score`). Both start at 0.
 */
export const AppraisalKras = Blueprint.value(
  Schema.Array(Schema.Struct({ kra: kraId, weightage: Weightage.schema, score: Score.schema, earned: Score.schema })).check(Schema.isMaxLength(20)),
);
/** Ratings against criteria (HRMS's Employee Feedback Rating rows): an appraisal's self ratings, or a feedback's. */
export const CriteriaRatings = Blueprint.value(
  Schema.Array(Schema.Struct({ criteria: criteriaId, weightage: Weightage.schema, rating: Rating.schema })).check(Schema.isMaxLength(20)),
);
/** What a reviewer, or the employee rating themselves, sends: a rating for each of the template's criteria, each once. */
export const GivenRatings = Blueprint.value(Schema.Array(Schema.Struct({ criteria: criteriaId, rating: Rating.schema })).check(Schema.isMaxLength(20)));
/** What the owner sends to rate an appraisal by hand: a score from 0 to 5 for each of its KRAs, each once. */
export const GivenScores = Blueprint.value(Schema.Array(Schema.Struct({ kra: kraId, score: Score.schema })).check(Schema.isMaxLength(20)));

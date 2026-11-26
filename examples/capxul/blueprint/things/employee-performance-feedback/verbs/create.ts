import { Blueprint } from "orthograph";
import { EmployeePerformanceFeedback } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  FeedbackCycleCompleted,
  FeedbackForOneself,
  FeedbackRatingOutOfRange,
  FeedbackRatingsDontMatchCriteria,
  ReviewerHasLeft,
  ReviewerNotInCompany,
} from "../errors.ts";
import { self } from "../../employee/roles.ts";
import { GivenRatings } from "../../../values/appraisal-lines.ts";

// HRMS's Employee Performance Feedback, drafted: the appraisal's employee, cycle and company are copied, the ratings
// take the appraisal's criteria and weightages, and the total is rating × 5 × weightage ÷ 100 summed (`set_total_score`).
// Refusal order (errors.ts).
export default Blueprint.operation(EmployeePerformanceFeedback, {
  description: "Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria.",
  payload: {
    appraisal: EmployeePerformanceFeedback.fields.appraisal,
    reviewer: EmployeePerformanceFeedback.fields.reviewer,
    feedback: EmployeePerformanceFeedback.fields.feedback,
    ratings: GivenRatings,
  },
  answer: { employeePerformanceFeedback: EmployeePerformanceFeedback.fields.id, totalScore: EmployeePerformanceFeedback.fields.totalScore },
  move: machine.moves.create,
  errors: [FeedbackCycleCompleted, FeedbackForOneself, ReviewerNotInCompany, ReviewerHasLeft, FeedbackRatingsDontMatchCriteria, FeedbackRatingOutOfRange],
  allowed: [self.of("reviewer")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});

import { Blueprint } from "orthograph";
import { EmployeePerformanceFeedback } from "../thing.ts";
import { machine } from "../machine.ts";
import { FeedbackCycleCompleted } from "../errors.ts";
import { self } from "../../employee/roles.ts";
import { Appraisal } from "../../appraisal/thing.ts";

// HRMS's `on_submit`: the appraisal's average feedback score becomes the average of its submitted feedbacks' totals,
// and its final score follows (`calculate_avg_feedback_score(update=True)`). A reviewer who has left since drafting may
// still submit (CX-expense-leavers). Refusal order (errors.ts).
export default Blueprint.operation(EmployeePerformanceFeedback, {
  description: "Submit your feedback, counting it in the appraisal's average.",
  payload: { employeePerformanceFeedback: EmployeePerformanceFeedback.fields.id },
  answer: { employeePerformanceFeedback: EmployeePerformanceFeedback.fields.id, avgFeedbackScore: Appraisal.fields.avgFeedbackScore, appraisal: Appraisal.fields.id },
  move: machine.moves.submit,
  errors: [FeedbackCycleCompleted],
  allowed: [self.of("employeePerformanceFeedback.reviewer")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database({ writes: [EmployeePerformanceFeedback, Appraisal] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});

import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Appraisal } from "../appraisal/thing.ts";
import { AppraisalCycle } from "../appraisal-cycle/thing.ts";
import { FeedbackText, Score } from "../../values/appraisals.ts";
import { CriteriaRatings } from "../../values/appraisal-lines.ts";

// HRMS's Employee Performance Feedback (hrms/hr/doctype/employee_performance_feedback): the appraisal, its employee and
// cycle, the reviewer (an employee), what they wrote, their ratings against the template's criteria, and its total score.
// Its company is the appraisal's. Its copied names and `added_on` are left out (`decisions/CX-appraisals.md`).
export const EmployeePerformanceFeedback = Blueprint.thing({
  description: "What one colleague thinks of an employee's work, for their appraisal.",
  code: "PF",
  fields: {
    id: Blueprint.id("epf"),
    company: Company.fields.id,
    appraisal: Appraisal.fields.id,
    appraisalCycle: AppraisalCycle.fields.id,
    employee: Blueprint.described(Employee.fields.id, "The employee the feedback is about."),
    reviewer: Blueprint.described(Employee.fields.id, "The employee who gives it."),
    feedback: FeedbackText,
    ratings: CriteriaRatings,
    totalScore: Blueprint.described(Score, "The ratings' score out of 5 (HRMS's `total_score`)."),
  },
});

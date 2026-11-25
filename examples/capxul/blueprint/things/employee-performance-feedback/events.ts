import { Blueprint } from "orthograph";
import { EmployeePerformanceFeedback } from "./thing.ts";

export const PerformanceFeedbackDrafted = Blueprint.event({
  employeePerformanceFeedback: EmployeePerformanceFeedback.fields.id,
  appraisal: EmployeePerformanceFeedback.fields.appraisal,
  reviewer: EmployeePerformanceFeedback.fields.reviewer,
  totalScore: EmployeePerformanceFeedback.fields.totalScore,
});
export const PerformanceFeedbackSubmitted = Blueprint.event({
  employeePerformanceFeedback: EmployeePerformanceFeedback.fields.id,
  appraisal: EmployeePerformanceFeedback.fields.appraisal,
  totalScore: EmployeePerformanceFeedback.fields.totalScore,
});

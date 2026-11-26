import { Blueprint } from "orthograph";
import { EmployeeFeedbackCriteria } from "./thing.ts";

export const FeedbackCriteriaCreated = Blueprint.event({
  employeeFeedbackCriteria: EmployeeFeedbackCriteria.fields.id,
  company: EmployeeFeedbackCriteria.fields.company,
});

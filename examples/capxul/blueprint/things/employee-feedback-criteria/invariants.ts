import { Blueprint } from "orthograph";
import { EmployeeFeedbackCriteria } from "./thing.ts";
import { CriteriaNameTaken } from "./errors.ts";

// HRMS names a criteria by itself; here within its company.
export const oneNamePerCompany = Blueprint.invariant.unique([EmployeeFeedbackCriteria.fields.company, EmployeeFeedbackCriteria.fields.criteria], {
  refuse: CriteriaNameTaken,
});

import { Blueprint } from "orthograph";
import { EmployeeGrade } from "./thing.ts";
import { EmployeeGradeNameTaken } from "./errors.ts";

// HRMS names a grade by what the user types, so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([EmployeeGrade.fields.company, EmployeeGrade.fields.gradeName], {
  refuse: EmployeeGradeNameTaken,
});

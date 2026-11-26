import { Blueprint } from "orthograph";
import { EmploymentType } from "./thing.ts";
import { EmploymentTypeNameTaken } from "./errors.ts";

// HRMS names a type by its name (`autoname: field:employee_type_name`), so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([EmploymentType.fields.company, EmploymentType.fields.employmentTypeName], {
  refuse: EmploymentTypeNameTaken,
});

import { Blueprint } from "orthograph";
import { Department } from "./thing.ts";
import { DepartmentNameTaken } from "./errors.ts";

// ERPNext names a department "<name> - <abbr>", so a company has one department of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([Department.fields.company, Department.fields.departmentName], {
  refuse: DepartmentNameTaken,
});

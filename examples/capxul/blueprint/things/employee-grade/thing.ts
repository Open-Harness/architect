import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// HRMS's Employee Grade (hrms/hr/doctype/employee_grade), named by the user. Its three fields, a default salary
// structure, its base pay and that structure's currency, come with Salary Structure in payroll (slice 9). HRMS names a
// grade across a site; Capxul's companies are separate organisations (K42, call 10), so each keeps its own.
export const EmployeeGrade = Blueprint.thing({
  description: "A level a company places its employees at, such as junior or senior.",
  code: "EG",
  fields: { id: Blueprint.id("egr"), company: Company.fields.id, gradeName: Name },
});

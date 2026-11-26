import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// HRMS's Employment Type (hrms/hr/doctype/employment_type), its one field. HRMS names a type by it across a site;
// Capxul's companies are separate organisations (K42, call 10), so each keeps its own. An employee is placed under one
// once things have optional references (#742, item 5), as HRMS leaves `employment_type` optional on Employee.
export const EmploymentType = Blueprint.thing({
  description: "A way a company employs people, such as full-time or contract.",
  code: "TY",
  fields: { id: Blueprint.id("ety"), company: Company.fields.id, employmentTypeName: Name },
});

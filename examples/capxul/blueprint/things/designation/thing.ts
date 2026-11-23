import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Designation (erpnext/setup/doctype/designation), a job title. ERPNext shares one list across every
// company on a site; Capxul's companies are separate organisations (K42, call 10), so each keeps its own.
export const Designation = Blueprint.thing({
  description: "A job title a company gives its employees.",
  code: "DS",
  fields: { id: Blueprint.id("dsg"), company: Company.fields.id, designationName: Name },
});

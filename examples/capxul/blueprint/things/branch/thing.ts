import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Branch (erpnext/setup/doctype/branch), its one field. ERPNext names a branch by it across a site; Capxul's
// companies are separate organisations (K42, call 10), so each keeps its own.
export const Branch = Blueprint.thing({
  description: "A place a company works from, such as an office or a site.",
  code: "BR",
  fields: { id: Blueprint.id("brn"), company: Company.fields.id, branchName: Name },
});

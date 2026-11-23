import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Department (erpnext/setup/doctype/department), its two required fields. ERPNext's tree of departments
// (`parent_department`) waits on optional references (#742, item 5).
export const Department = Blueprint.thing({
  description: "A part of a company that its employees work in.",
  fields: { id: Blueprint.id("dep"), company: Company.fields.id, departmentName: Name },
});

import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Department } from "../department/thing.ts";
import { Designation } from "../designation/thing.ts";
import { Name } from "../../values/company.ts";
import { Day, Gender } from "../../values/employee.ts";

// ERPNext's Employee (erpnext/setup/doctype/employee): its required fields, and the department and designation it
// is placed in. ERPNext's `user_id` is `person`, the Capxul account the employee signs in with; ERPNext leaves both
// it and the placement optional, and they are required here until things have optional references (#742, item 5).
export const Employee = Blueprint.thing({
  description: "A person a company employs.",
  fields: {
    id: Blueprint.id("emp"),
    company: Company.fields.id,
    person: Blueprint.described(Blueprint.id("per"), "The person employed, who signs in as themselves."),
    firstName: Name,
    gender: Gender,
    dateOfBirth: Day,
    dateOfJoining: Day,
    department: Department.fields.id,
    designation: Designation.fields.id,
  },
});

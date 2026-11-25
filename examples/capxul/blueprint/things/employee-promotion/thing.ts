import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Designation } from "../designation/thing.ts";
import { Day } from "../../values/employee.ts";

// HRMS's Employee Promotion (hrms/hr/doctype/employee_promotion): the employee, the promotion's day, and the job title
// as one Employee Property History line, its `current` copied from the employee on create and its `new`. Its company
// is the employee's (`fetch_from`). A grade and a branch change wait on an employee that has them, and pay (`ctc`,
// `revised_ctc`) on payroll (`decisions/CX-employee-moves.md`).
export const EmployeePromotion = Blueprint.thing({
  description: "A change of an employee's job title, from one day.",
  code: "PM",
  fields: {
    id: Blueprint.id("epr"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    promotionDate: Day,
    currentDesignation: Blueprint.described(Designation.fields.id, "The job title the employee held when the promotion was drafted."),
    newDesignation: Blueprint.described(Designation.fields.id, "The job title the employee holds once it is submitted."),
  },
});

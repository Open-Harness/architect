import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Department } from "../department/thing.ts";
import { Day } from "../../values/employee.ts";

// HRMS's Employee Transfer (hrms/hr/doctype/employee_transfer): the employee, the transfer's day, and the department
// as one Employee Property History line, its `current` copied from the employee on create and its `new`. Its company
// is the employee's (`fetch_from`), and a transfer stays in it: HRMS's move to another company (`new_company`,
// `create_new_employee_id`) makes a new employee, and is a known limit, as are `reallocate_leaves` and other lines
// (`decisions/CX-employee-moves.md`).
export const EmployeeTransfer = Blueprint.thing({
  description: "A change of an employee's department, from one day.",
  code: "TR",
  fields: {
    id: Blueprint.id("etr"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    transferDate: Day,
    currentDepartment: Blueprint.described(Department.fields.id, "The department the employee held when the transfer was drafted."),
    newDepartment: Blueprint.described(Department.fields.id, "The department the employee holds once it is submitted."),
  },
});

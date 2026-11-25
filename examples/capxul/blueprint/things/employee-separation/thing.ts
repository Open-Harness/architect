import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { Day } from "../../values/employee.ts";

// HRMS's Employee Separation (hrms/hr/doctype/employee_separation): the employee, the day of their resignation letter
// and the day the separation begins. Its company is the employee's (`fetch_from`). Its activities, template, project
// and tasks, exit interview and Full and Final settlement are known limits (`decisions/CX-employee-moves.md`).
// HRMS fetches `resignation_letter_date` from the employee, which has none here yet (#742, item 5), so it is typed.
export const EmployeeSeparation = Blueprint.thing({
  description: "An employee's way out of the company, from their resignation to the end of their leaving.",
  code: "SP",
  fields: {
    id: Blueprint.id("esp"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    resignationLetterDate: Day,
    boardingBeginsOn: Day,
  },
});

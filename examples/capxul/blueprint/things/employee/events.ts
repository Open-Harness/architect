import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";
import { Day } from "../../values/employee.ts";

export const EmployeeHired = Blueprint.event({
  employee: Employee.fields.id,
  company: Employee.fields.company,
  person: Employee.fields.person,
});
export const EmployeeRelieved = Blueprint.event({ employee: Employee.fields.id, relievingDate: Day });

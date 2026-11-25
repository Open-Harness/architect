import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "./thing.ts";

export const EmployeeSeparationStarted = Blueprint.event({
  employeeSeparation: EmployeeSeparation.fields.id,
  employee: EmployeeSeparation.fields.employee,
});
export const EmployeeSeparationBegun = Blueprint.event({ employeeSeparation: EmployeeSeparation.fields.id });
export const EmployeeSeparationCompleted = Blueprint.event({ employeeSeparation: EmployeeSeparation.fields.id });

import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "./thing.ts";

export const EmployeeTransferDrafted = Blueprint.event({
  employeeTransfer: EmployeeTransfer.fields.id,
  employee: EmployeeTransfer.fields.employee,
});
/** `department` is the department the employee now holds: the transfer's new one. */
export const EmployeeTransferred = Blueprint.event({
  employeeTransfer: EmployeeTransfer.fields.id,
  employee: EmployeeTransfer.fields.employee,
  department: EmployeeTransfer.fields.newDepartment,
});
/** `department` is the department put back: the transfer's current one. */
export const EmployeeTransferCancelled = Blueprint.event({
  employeeTransfer: EmployeeTransfer.fields.id,
  employee: EmployeeTransfer.fields.employee,
  department: EmployeeTransfer.fields.currentDepartment,
});

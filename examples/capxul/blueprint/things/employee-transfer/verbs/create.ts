import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "../thing.ts";
import { machine } from "../machine.ts";
import { DepartmentUnchanged, NewDepartmentNotInCompany, TransferredEmployeeHasLeft, TransferredEmployeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). The current department is the employee's, copied on create; it isn't in the payload.
// HRMS has no bound between the transfer's day and the joining day, so none is refused here. HRMS's Employee Transfer
// doesn't call `validate_active_employee`, but its form offers only Active employees (TransferredEmployeeHasLeft).
export default Blueprint.operation(EmployeeTransfer, {
  description: "Draft a transfer: an employee's new department, from a day.",
  payload: {
    company: EmployeeTransfer.fields.company,
    employee: EmployeeTransfer.fields.employee,
    transferDate: EmployeeTransfer.fields.transferDate,
    newDepartment: EmployeeTransfer.fields.newDepartment,
  },
  answer: { employeeTransfer: EmployeeTransfer.fields.id },
  move: machine.moves.create,
  errors: [TransferredEmployeeNotInCompany, TransferredEmployeeHasLeft, NewDepartmentNotInCompany, DepartmentUnchanged],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

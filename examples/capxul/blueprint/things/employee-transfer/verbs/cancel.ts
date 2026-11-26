import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { Employee } from "../../employee/thing.ts";

// HRMS's `on_cancel`: the employee's department goes back to the transfer's current one, whatever they hold now, as
// `update_employee_work_history(..., cancel=True)` sets each line's `current` without comparing.
export default Blueprint.operation(EmployeeTransfer, {
  description: "Cancel a submitted transfer, putting back the department it replaced.",
  payload: { employeeTransfer: EmployeeTransfer.fields.id },
  answer: {
    employeeTransfer: EmployeeTransfer.fields.id,
    employee: EmployeeTransfer.fields.employee,
    department: EmployeeTransfer.fields.currentDepartment,
  },
  move: machine.moves.cancel,
  allowed: [owner.of("employeeTransfer.company")],
  steps: { update: Blueprint.step.database({ writes: [EmployeeTransfer, Employee] }) },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

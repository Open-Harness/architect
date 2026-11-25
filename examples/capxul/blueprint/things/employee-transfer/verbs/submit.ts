import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "../thing.ts";
import { machine } from "../machine.ts";
import { TransferNotYetDue } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Employee } from "../../employee/thing.ts";

// HRMS's `on_submit`: the employee takes the new department. The employee isn't judged again: a transfer drafted
// before they left can still be submitted (CX-expense-leavers). Writing the employee's department is a field update on
// another thing, so the step names Employee in `writes` (`decisions/CX-takeover.md`).
export default Blueprint.operation(EmployeeTransfer, {
  description: "Submit a transfer on or after its day, giving the employee the new department.",
  payload: { employeeTransfer: EmployeeTransfer.fields.id },
  answer: {
    employeeTransfer: EmployeeTransfer.fields.id,
    employee: EmployeeTransfer.fields.employee,
    department: EmployeeTransfer.fields.newDepartment,
  },
  move: machine.moves.submit,
  errors: [TransferNotYetDue],
  allowed: [owner.of("employeeTransfer.company")],
  steps: { update: Blueprint.step.database({ writes: [EmployeeTransfer, Employee] }) },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

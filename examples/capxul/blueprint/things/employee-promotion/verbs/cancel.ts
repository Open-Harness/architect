import { Blueprint } from "orthograph";
import { EmployeePromotion } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { Employee } from "../../employee/thing.ts";

// HRMS's `on_cancel`: the employee's job title goes back to the promotion's current one, whatever they hold now, as
// `update_employee_work_history(..., cancel=True)` sets each line's `current` without comparing.
export default Blueprint.operation(EmployeePromotion, {
  description: "Cancel a submitted promotion, putting back the job title it replaced.",
  payload: { employeePromotion: EmployeePromotion.fields.id },
  answer: {
    employeePromotion: EmployeePromotion.fields.id,
    employee: EmployeePromotion.fields.employee,
    designation: EmployeePromotion.fields.currentDesignation,
  },
  move: machine.moves.cancel,
  allowed: [owner.of("employeePromotion.company")],
  steps: { update: Blueprint.step.database({ writes: [EmployeePromotion, Employee] }) },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

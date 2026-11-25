import { Blueprint } from "orthograph";
import { EmployeePromotion } from "../thing.ts";
import { machine } from "../machine.ts";
import { PromotionNotYetDue } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Employee } from "../../employee/thing.ts";

// HRMS's `on_submit`: the employee takes the new job title. The employee isn't judged again: a promotion drafted
// before they left can still be submitted (CX-expense-leavers). Writing the employee's job title is a field update on
// another thing, so the step names Employee in `writes` (`decisions/CX-takeover.md`).
export default Blueprint.operation(EmployeePromotion, {
  description: "Submit a promotion on or after its day, giving the employee the new job title.",
  payload: { employeePromotion: EmployeePromotion.fields.id },
  answer: {
    employeePromotion: EmployeePromotion.fields.id,
    employee: EmployeePromotion.fields.employee,
    designation: EmployeePromotion.fields.newDesignation,
  },
  move: machine.moves.submit,
  errors: [PromotionNotYetDue],
  allowed: [owner.of("employeePromotion.company")],
  steps: { update: Blueprint.step.database({ writes: [EmployeePromotion, Employee] }) },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

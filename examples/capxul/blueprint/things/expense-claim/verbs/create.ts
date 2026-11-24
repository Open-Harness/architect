import { Blueprint } from "orthograph";
import { ExpenseClaim } from "../thing.ts";
import { machine } from "../machine.ts";
import { ClaimantNotActive, EmployeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// Refusal order (errors.ts): EmployeeNotInCompany before ClaimantNotActive. ClaimantNotActive is judged on create only.
// A new claim holds no expenses, so both its totals are 0.
export default Blueprint.operation(ExpenseClaim, {
  description: "Start an employee's claim for expenses the company pays back.",
  payload: { company: ExpenseClaim.fields.company, employee: ExpenseClaim.fields.employee, postingDate: ExpenseClaim.fields.postingDate },
  answer: { expenseClaim: ExpenseClaim.fields.id },
  move: machine.moves.create,
  errors: [ClaimantNotActive, EmployeeNotInCompany],
  allowed: [self.of("employee"), owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

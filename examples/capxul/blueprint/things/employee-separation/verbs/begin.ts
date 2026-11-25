import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// Only the separation's state moves (HRMS's `boarding_status`).
export default Blueprint.operation(EmployeeSeparation, {
  description: "Mark a separation in process.",
  payload: { employeeSeparation: EmployeeSeparation.fields.id },
  answer: { employeeSeparation: EmployeeSeparation.fields.id },
  move: machine.moves.begin,
  allowed: [owner.of("employeeSeparation.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

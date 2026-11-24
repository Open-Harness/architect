import { Blueprint } from "orthograph";
import { Employee } from "../thing.ts";
import { machine } from "../machine.ts";
import { RelievedBeforeJoined } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { Day } from "../../../values/employee.ts";

// ERPNext sets status Left with a relieving date. The date travels in the event until things have optional fields
// (#742, item 5), since an employee still at work has none.
export default Blueprint.operation(Employee, {
  description: "Record that an employee has left the company, on the day they were relieved.",
  payload: { employee: Employee.fields.id, relievingDate: Day },
  answer: { employee: Employee.fields.id, relievingDate: Day },
  move: machine.moves.relieve,
  errors: [RelievedBeforeJoined],
  allowed: [owner.of("employee.company")],
  steps: { load: Blueprint.step.database(), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

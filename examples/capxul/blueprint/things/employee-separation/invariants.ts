import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "./thing.ts";
import { machine } from "./machine.ts";
import { SeparationAlreadyOpen } from "./errors.ts";

// Capxul's own rule: one separation per employee while it is open. A completed one frees the employee for another, as
// someone rehired may leave again.
export const oneOpenSeparationPerEmployee = Blueprint.invariant.unique(EmployeeSeparation.fields.employee, {
  while: [machine.states.pending, machine.states.inProcess],
  refuse: SeparationAlreadyOpen,
});

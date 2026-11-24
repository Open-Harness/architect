import { Blueprint } from "orthograph";
import { Designation } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: DesignationNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(Designation, {
  description: "Add a job title to a company.",
  payload: { company: Designation.fields.company, designationName: Designation.fields.designationName },
  answer: { designation: Designation.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

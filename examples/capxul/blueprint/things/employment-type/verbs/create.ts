import { Blueprint } from "orthograph";
import { EmploymentType } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: EmploymentTypeNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(EmploymentType, {
  description: "Add a way a company employs people.",
  payload: { company: EmploymentType.fields.company, employmentTypeName: EmploymentType.fields.employmentTypeName },
  answer: { employmentType: EmploymentType.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

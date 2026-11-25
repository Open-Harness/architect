import { Blueprint } from "orthograph";
import { EmployeeFeedbackCriteria } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: CriteriaNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(EmployeeFeedbackCriteria, {
  description: "Add something a company rates its people on.",
  payload: { company: EmployeeFeedbackCriteria.fields.company, criteria: EmployeeFeedbackCriteria.fields.criteria },
  answer: { employeeFeedbackCriteria: EmployeeFeedbackCriteria.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

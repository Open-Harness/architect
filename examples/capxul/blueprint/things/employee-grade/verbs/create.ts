import { Blueprint } from "orthograph";
import { EmployeeGrade } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: EmployeeGradeNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(EmployeeGrade, {
  description: "Add a grade to a company.",
  payload: { company: EmployeeGrade.fields.company, gradeName: EmployeeGrade.fields.gradeName },
  answer: { grade: EmployeeGrade.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

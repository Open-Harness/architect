import { Blueprint } from "orthograph";
import { Department } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: DepartmentNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(Department, {
  description: "Add a department to a company.",
  payload: { company: Department.fields.company, departmentName: Department.fields.departmentName },
  answer: { department: Department.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

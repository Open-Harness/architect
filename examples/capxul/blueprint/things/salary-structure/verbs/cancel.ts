import { Blueprint } from "orthograph";
import { SalaryStructure } from "../thing.ts";
import { machine } from "../machine.ts";
import { StructureInUse } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Frappe's cancel refuses while a submitted document links to it (errors.ts). A cancelled structure can't be assigned.
export default Blueprint.operation(SalaryStructure, {
  description: "Cancel a submitted salary structure no assignment or salary slip uses.",
  payload: { salaryStructure: SalaryStructure.fields.id },
  answer: { salaryStructure: SalaryStructure.fields.id },
  move: machine.moves.cancel,
  errors: [StructureInUse],
  allowed: [owner.of("salaryStructure.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

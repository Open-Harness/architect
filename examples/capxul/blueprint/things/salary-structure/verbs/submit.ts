import { Blueprint } from "orthograph";
import { SalaryStructure } from "../thing.ts";
import { machine } from "../machine.ts";
import { StructureNetPayNegative } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Once submitted, a structure can be assigned to employees.
export default Blueprint.operation(SalaryStructure, {
  description: "Submit a salary structure, so it can be assigned.",
  payload: { salaryStructure: SalaryStructure.fields.id },
  answer: { salaryStructure: SalaryStructure.fields.id },
  move: machine.moves.submit,
  errors: [StructureNetPayNegative],
  allowed: [owner.of("salaryStructure.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

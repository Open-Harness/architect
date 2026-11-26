import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// Nothing links to an assignment, so nothing stops its cancel. Payroll no longer counts it. The answer names the
// structure.
export default Blueprint.operation(SalaryStructureAssignment, {
  description: "Cancel a submitted assignment, so payroll no longer counts it.",
  payload: { salaryStructureAssignment: SalaryStructureAssignment.fields.id },
  answer: { salaryStructureAssignment: SalaryStructureAssignment.fields.id, salaryStructure: SalaryStructureAssignment.fields.salaryStructure },
  move: machine.moves.cancel,
  allowed: [owner.of("salaryStructureAssignment.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "../thing.ts";
import { machine } from "../machine.ts";
import { AssignedStructureNotSubmitted, AssignmentExists } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HRMS runs `validate` again on submit: another assignment of the employee submitted on the same day since this one was
// made refuses it, and so does its structure cancelled since. Refusal order: AssignmentExists, then
// AssignedStructureNotSubmitted. The answer names the employee and the structure.
export default Blueprint.operation(SalaryStructureAssignment, {
  description: "Submit an assignment, so payroll pays the employee by its structure from its day on.",
  payload: { salaryStructureAssignment: SalaryStructureAssignment.fields.id },
  answer: {
    salaryStructureAssignment: SalaryStructureAssignment.fields.id,
    employee: SalaryStructureAssignment.fields.employee,
    salaryStructure: SalaryStructureAssignment.fields.salaryStructure,
  },
  move: machine.moves.submit,
  errors: [AssignmentExists, AssignedStructureNotSubmitted],
  allowed: [owner.of("salaryStructureAssignment.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

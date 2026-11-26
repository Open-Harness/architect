import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  AssignedEmployeeHasLeft,
  AssignedEmployeeNotInCompany,
  AssignedStructureNotInCompany,
  AssignedStructureNotSubmitted,
  AssignmentBeforeJoining,
  AssignmentExists,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts).
export default Blueprint.operation(SalaryStructureAssignment, {
  description: "Assign a salary structure to an employee from a day on.",
  payload: {
    company: SalaryStructureAssignment.fields.company,
    employee: SalaryStructureAssignment.fields.employee,
    salaryStructure: SalaryStructureAssignment.fields.salaryStructure,
    fromDate: SalaryStructureAssignment.fields.fromDate,
  },
  answer: { salaryStructureAssignment: SalaryStructureAssignment.fields.id },
  move: machine.moves.create,
  errors: [
    AssignedEmployeeNotInCompany,
    AssignedEmployeeHasLeft,
    AssignmentExists,
    AssignmentBeforeJoining,
    AssignedStructureNotInCompany,
    AssignedStructureNotSubmitted,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});

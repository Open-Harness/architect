import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "./thing.ts";

export const SalaryStructureAssigned = Blueprint.event({
  salaryStructureAssignment: SalaryStructureAssignment.fields.id,
  employee: SalaryStructureAssignment.fields.employee,
  salaryStructure: SalaryStructureAssignment.fields.salaryStructure,
  fromDate: SalaryStructureAssignment.fields.fromDate,
});
export const SalaryStructureAssignmentSubmitted = Blueprint.event({ salaryStructureAssignment: SalaryStructureAssignment.fields.id });
export const SalaryStructureAssignmentCancelled = Blueprint.event({ salaryStructureAssignment: SalaryStructureAssignment.fields.id });

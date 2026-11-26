import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { SalaryStructure } from "../salary-structure/thing.ts";
import { Day } from "../../values/employee.ts";

// HRMS's Salary Structure Assignment (hrms/payroll/doctype/salary_structure_assignment), submittable: an employee paid
// by a structure from a day on, until a later assignment takes over. `base` and `variable` are left out with formulas,
// which alone read them; the payroll payable account and payroll cost centers are the payroll entry's alone; the tax
// slab and opening tax figures come with tax (`decisions/CX-payroll.md`).
export const SalaryStructureAssignment = Blueprint.thing({
  description: "An employee paid by a salary structure from a day on.",
  code: "SA",
  fields: {
    id: Blueprint.id("ssa"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    salaryStructure: SalaryStructure.fields.id,
    fromDate: Blueprint.described(Day, "The first day the structure pays the employee."),
  },
});
